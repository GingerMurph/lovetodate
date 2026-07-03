// E2E test: verifies claim-free-connection enforces auth, input validation,
// and — most importantly — that the SECURITY DEFINER RPC serialises concurrent
// calls so a single unlocker can never claim more than one free connection.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const FN_URL = `${SUPABASE_URL}/functions/v1/claim-free-connection`;

async function call(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json: json as Record<string, unknown> | null, text };
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
    const res = await call({ targetUserId: crypto.randomUUID() });
    assertEquals(res.status, 401);
  },
});

Deno.test({
  name: "rejects missing targetUserId",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUpUser(
      `cfc-noid-${crypto.randomUUID()}@example.com`,
      `Pw!${crypto.randomUUID()}`,
    );
    if (error || !data.session) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await call({}, data.session.access_token);
    assertEquals(res.status, 400);
  },
});

Deno.test({
  name: "rejects malformed targetUserId (uuid regex)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUpUser(
      `cfc-bad-${crypto.randomUUID()}@example.com`,
      `Pw!${crypto.randomUUID()}`,
    );
    if (error || !data.session) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await call({ targetUserId: "not-a-uuid" }, data.session.access_token);
    assertEquals(res.status, 400);
    assertEquals(res.json?.error, "Invalid targetUserId format");
  },
});

Deno.test({
  name: "rejects self-unlock",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUpUser(
      `cfc-self-${crypto.randomUUID()}@example.com`,
      `Pw!${crypto.randomUUID()}`,
    );
    if (error || !data.session || !data.user) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await call({ targetUserId: data.user.id }, data.session.access_token);
    assertEquals(res.status, 400);
    assertEquals(res.json?.error, "Cannot unlock yourself");
  },
});

Deno.test({
  name: "rejects claim without mutual like",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const pwd = `Pw!${crypto.randomUUID()}`;
    const { data: a, error: errA } = await signUpUser(`cfc-nolike-a-${crypto.randomUUID()}@example.com`, pwd);
    const { data: b, error: errB } = await signUpUser(`cfc-nolike-b-${crypto.randomUUID()}@example.com`, pwd);
    if (errA || errB || !a.session || !b.user) {
      console.warn("Skipping: signup unavailable");
      return;
    }
    const res = await call({ targetUserId: b.user.id }, a.session.access_token);
    assertEquals(res.status, 400);
    assertEquals(res.json?.error, "Mutual like required to claim free connection");
  },
});

// The critical regression: concurrent claims for the same unlocker/target pair
// must all resolve to exactly one insert into unlocked_connections. The advisory
// lock in claim_free_connection_atomic() serialises the count()+insert so the
// first request wins with "ok" and every other request returns "already_used"
// (or "already_connected" if it observed the row post-insert).
Deno.test({
  name: "concurrent claims produce exactly one unlocked_connections row",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    if (!SERVICE_KEY) {
      console.warn("Skipping race test: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    const pwd = `Pw!${crypto.randomUUID()}`;
    const { client: clientA, data: a, error: errA } = await signUpUser(
      `cfc-race-a-${crypto.randomUUID()}@example.com`,
      pwd,
    );
    const { client: clientB, data: b, error: errB } = await signUpUser(
      `cfc-race-b-${crypto.randomUUID()}@example.com`,
      pwd,
    );
    if (errA || errB || !a.session || !b.session || !a.user || !b.user) {
      console.warn("Skipping race test: signup unavailable");
      return;
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Establish mutual like.
    const { error: like1 } = await clientA.from("likes").insert({ liker_id: a.user.id, liked_id: b.user.id });
    const { error: like2 } = await clientB.from("likes").insert({ liker_id: b.user.id, liked_id: a.user.id });
    assertEquals(like1, null);
    assertEquals(like2, null);

    // Clear any auto-unlock rows the mutual-like trigger may have created so we
    // are actually exercising the manual claim path.
    await admin
      .from("unlocked_connections")
      .delete()
      .or(
        `and(unlocker_id.eq.${a.user.id},target_id.eq.${b.user.id}),and(unlocker_id.eq.${b.user.id},target_id.eq.${a.user.id})`,
      );

    // Fire 5 concurrent claims as user A.
    const tokenA = a.session.access_token;
    const results = await Promise.all(
      Array.from({ length: 5 }, () => call({ targetUserId: b.user!.id }, tokenA)),
    );

    const successes = results.filter((r) => r.status === 200);
    const alreadyUsed = results.filter((r) => r.status === 403);
    const alreadyConnected = results.filter(
      (r) => r.status === 400 && r.json?.error === "Already connected",
    );

    assertEquals(
      successes.length,
      1,
      `expected exactly 1 success, got ${successes.length}. statuses=${results.map((r) => r.status).join(",")}`,
    );
    assertEquals(
      successes.length + alreadyUsed.length + alreadyConnected.length,
      results.length,
      `unexpected status codes: ${results.map((r) => `${r.status}:${r.text}`).join(" | ")}`,
    );

    // Confirm the database holds exactly one row for this unlocker/target pair.
    const { data: rows, error: rowsErr } = await admin
      .from("unlocked_connections")
      .select("id")
      .eq("unlocker_id", a.user.id)
      .eq("target_id", b.user.id);
    assertEquals(rowsErr, null);
    assert(rows);
    assertEquals(rows.length, 1, `expected 1 unlocked_connections row, got ${rows.length}`);

    // Cleanup.
    await admin.from("unlocked_connections").delete().or(
      `and(unlocker_id.eq.${a.user.id},target_id.eq.${b.user.id}),and(unlocker_id.eq.${b.user.id},target_id.eq.${a.user.id})`,
    );
    await admin.from("likes").delete().or(
      `and(liker_id.eq.${a.user.id},liked_id.eq.${b.user.id}),and(liker_id.eq.${b.user.id},liked_id.eq.${a.user.id})`,
    );
  },
});
