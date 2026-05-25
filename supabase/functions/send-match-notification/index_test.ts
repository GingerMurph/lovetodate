// E2E test: verifies that send-match-notification only succeeds when both users
// have liked each other. Exercises the deployed edge function over HTTP.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/send-match-notification`;

async function call(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

Deno.test("rejects unauthenticated callers", async () => {
  const res = await call({ matched_user_id: "00000000-0000-4000-8000-000000000000" });
  assertEquals(res.status, 401);
});

Deno.test("rejects invalid matched_user_id format", async () => {
  // Sign up a throwaway user so we get past the auth gate
  const client = createClient(SUPABASE_URL, ANON_KEY);
  const email = `mn-test-${crypto.randomUUID()}@example.com`;
  const password = `Pw!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({ email, password });
  if (error || !data.session) {
    console.warn("Skipping: signup requires email confirmation", error?.message);
    return;
  }
  const res = await call({ matched_user_id: "not-a-uuid" }, data.session.access_token);
  assertEquals(res.status, 400);
});

Deno.test("rejects one-sided like (no mutual match) and accepts mutual like", async () => {
  const clientA = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const clientB = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });

  const pwd = `Pw!${crypto.randomUUID()}`;
  const emailA = `mn-a-${crypto.randomUUID()}@example.com`;
  const emailB = `mn-b-${crypto.randomUUID()}@example.com`;

  const { data: a, error: errA } = await clientA.auth.signUp({ email: emailA, password: pwd });
  const { data: b, error: errB } = await clientB.auth.signUp({ email: emailB, password: pwd });

  if (errA || errB || !a.session || !b.session || !a.user || !b.user) {
    console.warn("Skipping mutual-like e2e: signup requires email confirmation");
    return;
  }

  const tokenA = a.session.access_token;
  const tokenB = b.session.access_token;
  const userA = a.user.id;
  const userB = b.user.id;

  // A likes B (one-sided). Calling as A must be rejected with 403.
  const { error: likeErr1 } = await clientA.from("likes").insert({ liker_id: userA, liked_id: userB });
  assertEquals(likeErr1, null);

  const oneSided = await call({ matched_user_id: userB }, tokenA);
  assertEquals(oneSided.status, 403, `expected 403, got ${oneSided.status}: ${oneSided.text}`);
  assertEquals(oneSided.json?.error, "Match not found");

  // B likes A back → mutual match. Now the call should succeed (0 push subs → sent: 0).
  const { error: likeErr2 } = await clientB.from("likes").insert({ liker_id: userB, liked_id: userA });
  assertEquals(likeErr2, null);

  const mutual = await call({ matched_user_id: userB }, tokenA);
  assertEquals(mutual.status, 200, `expected 200, got ${mutual.status}: ${mutual.text}`);
  assertEquals(typeof mutual.json?.sent, "number");
});
