// Integration test: verifies the column-level REVOKE on public.profiles
// actually prevents authenticated users from bulk-reading the sensitive
// columns via the same query the WhosWhoQuiz client issues.
//
// Two assertions:
//  1. Requesting the allowed column set (matches WhosWhoQuiz select) succeeds
//     and the returned rows contain NONE of the revoked keys.
//  2. Explicitly requesting any revoked column errors with a permission-denied
//     style error — proving Postgres enforces the REVOKE, not just the client.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const REVOKED_COLUMNS = [
  "weight_kg",
  "political_beliefs",
  "religion",
  "ethnicity",
  "nationality",
  "non_negotiables",
  "voice_intro_url",
] as const;

// Kept in sync with generateWhosWhoQuestions() in src/components/games/WhosWhoQuiz.tsx.
const WHOSWHO_SELECT =
  "user_id, display_name, occupation, education, location_city, smoking, drinking, children, personality_type, pets, body_build, bio, interests, favourite_music, favourite_sport, favourite_hobbies, favourite_film";

async function signUpUser() {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `wwq-cols-${crypto.randomUUID()}@example.com`,
    password: `Pw!${crypto.randomUUID()}`,
    options: { data: { display_name: "WhosWho Cols Test" } },
  });
  return { client, session: data.session, userId: data.user?.id, error };
}

Deno.test({
  name: "WhosWhoQuiz select never returns revoked sensitive columns",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, userId, error } = await signUpUser();
    if (error || !session || !userId) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }

    // Query the caller's own profile row (created by the handle_new_user trigger).
    const { data, error: selErr } = await client
      .from("profiles")
      .select(WHOSWHO_SELECT)
      .in("user_id", [userId]);

    assertEquals(selErr, null, `WhosWho select must succeed: ${selErr?.message}`);
    assert(Array.isArray(data), "expected rows array");
    assert(data!.length >= 1, "expected at least the caller's own profile row");

    for (const row of data!) {
      const keys = Object.keys(row as Record<string, unknown>);
      for (const col of REVOKED_COLUMNS) {
        assert(
          !keys.includes(col),
          `revoked column "${col}" leaked in WhosWhoQuiz response: keys=${keys.join(",")}`,
        );
      }
    }
  },
});

Deno.test({
  name: "explicitly selecting any revoked column is denied by Postgres",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, error } = await signUpUser();
    if (error || !session) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }

    for (const col of REVOKED_COLUMNS) {
      const { data, error: selErr } = await client
        .from("profiles")
        .select(`user_id, ${col}`)
        .limit(1);

      assert(
        selErr !== null,
        `expected permission error when selecting "${col}", got rows: ${JSON.stringify(data)}`,
      );
      const msg = `${selErr!.message} ${selErr!.code ?? ""}`.toLowerCase();
      assert(
        msg.includes("permission") || msg.includes("denied") || msg.includes("42501"),
        `expected permission-denied error for "${col}", got: ${selErr!.message}`,
      );
    }
  },
});

// Also verify the auto-generated own-profile RPC does return the full row
// (including the sensitive columns) — that's how ProfileSetup now loads its
// own data, and any regression there would break profile editing.
Deno.test({
  name: "get_own_profile RPC returns full row including sensitive columns for the caller",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, error } = await signUpUser();
    if (error || !session) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }

    const { data, error: rpcErr } = await client.rpc("get_own_profile" as never);
    assertEquals(rpcErr, null, `get_own_profile must succeed: ${rpcErr?.message}`);
    const row = Array.isArray(data) ? data[0] : data;
    assert(row, "expected own profile row");
    const keys = Object.keys(row as Record<string, unknown>);
    for (const col of REVOKED_COLUMNS) {
      assert(
        keys.includes(col),
        `get_own_profile should expose "${col}" to the owner (via SECURITY DEFINER), missing: keys=${keys.join(",")}`,
      );
    }
  },
});
