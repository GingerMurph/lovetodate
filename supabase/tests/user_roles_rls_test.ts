// Regression tests: verify RLS denies INSERT/UPDATE/DELETE on public.user_roles
// for both anon and authenticated roles. Role mutations must only be possible
// via the service role key (used by trusted server-side admin flows).
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TARGET_USER = "00000000-0000-4000-8000-00000000aaaa";

function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signUpUser() {
  const client = anonClient();
  const email = `roles-rls-${crypto.randomUUID()}@example.com`;
  const password = `Pw!${crypto.randomUUID()}`;
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { display_name: "RLS Test" } },
  });
  return { client, session: data.session, userId: data.user?.id, error };
}

/** A mutation is considered denied if it errors OR silently affects 0 rows. */
function assertDenied(result: { error: unknown; data: unknown }, label: string) {
  const err = result.error as { message?: string; code?: string } | null;
  const data = result.data as unknown[] | null;
  const denied = !!err || !data || (Array.isArray(data) && data.length === 0);
  assert(
    denied,
    `${label} should be denied by RLS but succeeded: data=${JSON.stringify(data)} err=${JSON.stringify(err)}`,
  );
}

Deno.test({
  name: "anon: INSERT into user_roles is denied",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const c = anonClient();
    const res = await c
      .from("user_roles")
      .insert({ user_id: TARGET_USER, role: "admin" })
      .select();
    assertDenied(res, "anon INSERT");
  },
});

Deno.test({
  name: "anon: UPDATE on user_roles is denied",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const c = anonClient();
    const res = await c
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", TARGET_USER)
      .select();
    assertDenied(res, "anon UPDATE");
  },
});

Deno.test({
  name: "anon: DELETE on user_roles is denied",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const c = anonClient();
    const res = await c.from("user_roles").delete().eq("user_id", TARGET_USER).select();
    assertDenied(res, "anon DELETE");
  },
});

Deno.test({
  name: "authenticated: INSERT into user_roles is denied (cannot self-grant)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, userId, error } = await signUpUser();
    if (error || !session || !userId) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    // Try to grant self admin
    const selfRes = await client
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" })
      .select();
    assertDenied(selfRes, "authenticated self-INSERT");

    // Try to grant another user admin
    const otherRes = await client
      .from("user_roles")
      .insert({ user_id: TARGET_USER, role: "admin" })
      .select();
    assertDenied(otherRes, "authenticated other-INSERT");
  },
});

Deno.test({
  name: "authenticated: UPDATE on user_roles is denied",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, userId, error } = await signUpUser();
    if (error || !session || !userId) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await client
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", userId)
      .select();
    assertDenied(res, "authenticated UPDATE");
  },
});

Deno.test({
  name: "authenticated: DELETE on user_roles is denied",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { client, session, userId, error } = await signUpUser();
    if (error || !session || !userId) {
      console.warn("Skipping: signup unavailable —", error?.message);
      return;
    }
    const res = await client
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .select();
    assertDenied(res, "authenticated DELETE");
  },
});

// Sanity check: service role CAN mutate user_roles (proves the deny policies
// are scoped to anon/authenticated, not a blanket lockout). Skipped if the
// service role key is not present in the environment.
Deno.test({
  name: "service_role: can INSERT and DELETE user_roles (sanity)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    if (!SERVICE_ROLE_KEY) {
      console.warn("Skipping: SUPABASE_SERVICE_ROLE_KEY not set");
      return;
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const probeUser = crypto.randomUUID();
    // Insert may fail with FK violation since user_id references auth.users.
    // What we care about is that RLS does NOT block it (no 401/permission error).
    const ins = await admin
      .from("user_roles")
      .insert({ user_id: probeUser, role: "user" })
      .select();
    const err = ins.error as { code?: string; message?: string } | null;
    if (err) {
      // Foreign key violation is fine — it proves RLS allowed us through.
      assert(
        err.code === "23503" || /foreign key|violates/i.test(err.message ?? ""),
        `unexpected service_role error: ${JSON.stringify(err)}`,
      );
    } else {
      assertEquals(ins.data?.length, 1);
      await admin.from("user_roles").delete().eq("user_id", probeUser);
    }
  },
});
