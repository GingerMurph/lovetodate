// E2E test: verifies send-match-notification only succeeds when both users
// have mutually liked each other. Hits the deployed function over HTTP and,
// when a service role key is available, asserts security_audit_log rows are
// written for every rejection path.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findAuditRow, hasServiceRoleKey } from "../_shared/audit-test-helpers.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/send-match-notification`;
const FUNCTION_NAME = "send-match-notification";

async function assertAudited(reasonCode: string, userId: string | null, sinceIso: string) {
  if (!hasServiceRoleKey()) return;
  const row = await findAuditRow({ functionName: FUNCTION_NAME, reasonCode, userId, sinceIso });
  assert(row, `expected security_audit_log row for ${FUNCTION_NAME}/${reasonCode} (user=${userId})`);
}


async function call(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

async function signUpUser(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: "Test User" } },
  });
  return { client, data, error };
}

Deno.test({
  name: "rejects unauthenticated callers",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await call({ matched_user_id: "00000000-0000-4000-8000-000000000000" });
    assertEquals(res.status, 401);
  },
});

Deno.test({
  name: "rejects unauthenticated callers and audits missing_auth_header",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const since = new Date().toISOString();
    const res = await call({ matched_user_id: "00000000-0000-4000-8000-000000000000" });
    assertEquals(res.status, 401);
    await assertAudited("missing_auth_header", null, since);
  },
});

Deno.test({
  name: "rejects bogus bearer tokens and audits invalid_jwt",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const since = new Date().toISOString();
    const headers = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: "Bearer not.a.jwt",
    };
    const res = await fetch(FN_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ matched_user_id: crypto.randomUUID() }),
    });
    await res.text();
    assertEquals(res.status, 401);
    await assertAudited("invalid_jwt", null, since);
  },
});

Deno.test({
  name: "rejects invalid matched_user_id format",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const email = `mn-test-${crypto.randomUUID()}@example.com`;
    const password = `Pw!${crypto.randomUUID()}`;
    const { data, error } = await signUpUser(email, password);
    if (error || !data.session) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await call({ matched_user_id: "not-a-uuid" }, data.session.access_token);
    assertEquals(res.status, 400);
  },
});

Deno.test({
  name: "rejects self-targeting and audits self_target",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const email = `mn-self-${crypto.randomUUID()}@example.com`;
    const password = `Pw!${crypto.randomUUID()}`;
    const { data, error } = await signUpUser(email, password);
    if (error || !data.session || !data.user) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const since = new Date().toISOString();
    const res = await call({ matched_user_id: data.user.id }, data.session.access_token);
    assertEquals(res.status, 400);
    await assertAudited("self_target", data.user.id, since);
  },
});


Deno.test({
  name: "rejects one-sided like and accepts mutual like",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const pwd = `Pw!${crypto.randomUUID()}`;
    const emailA = `mn-a-${crypto.randomUUID()}@example.com`;
    const emailB = `mn-b-${crypto.randomUUID()}@example.com`;

    const { client: clientA, data: a, error: errA } = await signUpUser(emailA, pwd);
    const { client: clientB, data: b, error: errB } = await signUpUser(emailB, pwd);

    if (errA || errB || !a.session || !b.session || !a.user || !b.user) {
      console.warn(
        "Skipping mutual-like e2e: signup unavailable —",
        errA?.message || errB?.message || "no session (email confirmation likely required)",
      );
      return;
    }

    const tokenA = a.session.access_token;
    const userA = a.user.id;
    const userB = b.user.id;

    // A likes B (one-sided) → call as A must be rejected with 403.
    const { error: likeErr1 } = await clientA.from("likes").insert({ liker_id: userA, liked_id: userB });
    assertEquals(likeErr1, null);

    const oneSided = await call({ matched_user_id: userB }, tokenA);
    assertEquals(oneSided.status, 403, `expected 403, got ${oneSided.status}: ${oneSided.text}`);
    assertEquals(oneSided.json?.error, "Match not found");

    // B likes A back → mutual match. Call should now succeed (0 push subs → sent: 0).
    const { error: likeErr2 } = await clientB.from("likes").insert({ liker_id: userB, liked_id: userA });
    assertEquals(likeErr2, null);

    const mutual = await call({ matched_user_id: userB }, tokenA);
    assertEquals(mutual.status, 200, `expected 200, got ${mutual.status}: ${mutual.text}`);
    assertEquals(typeof mutual.json?.sent, "number");
  },
});
