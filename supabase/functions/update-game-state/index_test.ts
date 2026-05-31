// Regression tests for update-game-state rejection paths and audit logging.
// Covers blocked game moves — every rejection must return the documented
// status code, and (when a service role key is available) must produce a
// matching security_audit_log row.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { findAuditRow, hasServiceRoleKey } from "../_shared/audit-test-helpers.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/update-game-state`;
const FUNCTION_NAME = "update-game-state";

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
    options: { data: { display_name: "Game Test" } },
  });
  return { client, data, error };
}

async function assertAudited(reasonCode: string, userId: string | null, sinceIso: string) {
  if (!hasServiceRoleKey()) return; // degrade gracefully
  const row = await findAuditRow({ functionName: FUNCTION_NAME, reasonCode, userId, sinceIso });
  assert(row, `expected security_audit_log row for ${FUNCTION_NAME}/${reasonCode} (user=${userId})`);
}

Deno.test({
  name: "logs missing_auth_header on unauthenticated request",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const since = new Date().toISOString();
    const res = await call({ gameId: "00000000-0000-4000-8000-000000000000", action: "move" });
    assertEquals(res.status, 401);
    await assertAudited("missing_auth_header", null, since);
  },
});

Deno.test({
  name: "logs invalid_jwt on bad bearer token",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const since = new Date().toISOString();
    const res = await call({ gameId: "00000000-0000-4000-8000-000000000000", action: "move" }, "not.a.jwt");
    assertEquals(res.status, 401);
    await assertAudited("invalid_jwt", null, since);
  },
});

Deno.test({
  name: "logs invalid_body when body is malformed",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const email = `gs-bad-${crypto.randomUUID()}@example.com`;
    const password = `Pw!${crypto.randomUUID()}`;
    const { data, error } = await signUpUser(email, password);
    if (error || !data.session || !data.user) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const since = new Date().toISOString();
    const res = await call({ gameId: "not-a-uuid", action: "move" }, data.session.access_token);
    assertEquals(res.status, 400);
    await assertAudited("invalid_body", data.user.id, since);
  },
});

Deno.test({
  name: "logs game_not_found for unknown gameId",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const email = `gs-nf-${crypto.randomUUID()}@example.com`;
    const password = `Pw!${crypto.randomUUID()}`;
    const { data, error } = await signUpUser(email, password);
    if (error || !data.session || !data.user) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const since = new Date().toISOString();
    const ghost = crypto.randomUUID();
    const res = await call({
      gameId: ghost,
      action: "move",
      gameState: { board: [] },
      currentTurn: data.user.id,
      status: "active",
    }, data.session.access_token);
    assertEquals(res.status, 404);
    assertEquals(res.json?.error, "Game not found");
    await assertAudited("game_not_found", data.user.id, since);
  },
});

Deno.test({
  name: "RLS blocks direct client INSERT into games and game_moves",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const email = `gs-rls-${crypto.randomUUID()}@example.com`;
    const password = `Pw!${crypto.randomUUID()}`;
    const { client, data, error } = await signUpUser(email, password);
    if (error || !data.session || !data.user) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }

    const { error: insertGameErr } = await client.from("games").insert({
      game_type: "noughts_crosses",
      creator_id: data.user.id,
      opponent_id: crypto.randomUUID(),
    } as any);
    assert(insertGameErr, "expected RLS to block direct games INSERT");

    const { error: insertMoveErr } = await client.from("game_moves").insert({
      game_id: crypto.randomUUID(),
      player_id: data.user.id,
      move_data: {},
    });
    assert(insertMoveErr, "expected RLS to block direct game_moves INSERT");
  },
});
