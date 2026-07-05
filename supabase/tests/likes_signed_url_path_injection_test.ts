// Integration test: verifies the `likes-profiles` edge function refuses to sign
// avatar storage URLs for paths that don't belong to the profile owner.
//
// Attack model:
//   1. Attacker (A) signs up and likes viewer (V).
//   2. Viewer (V) signs up and likes attacker (A) — mutual like so A appears in
//      V's likes-profiles response ("received" bucket).
//   3. Attacker updates their own profile's avatar_url to a storage path under
//      the victim's (X) storage folder — e.g. "victim-uuid/stolen.jpg".
//   4. Viewer calls the `likes-profiles` edge function.
//   5. Fix requires: `path.startsWith(`${rest.user_id}/`)` — so the injected
//      cross-user path must come back as `avatar_url: null` and must never
//      include the victim's user_id in a signed URL.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

async function signUpUser(tag: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signUp({
    email: `likes-sup-${tag}-${crypto.randomUUID()}@example.com`,
    password: `Pw!${crypto.randomUUID()}`,
    options: { data: { display_name: `LikesPathInject ${tag}` } },
  });
  return { client, session: data.session, userId: data.user?.id, error };
}

async function callEdge(fn: string, token: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-JSON */ }
  return { status: res.status, json, text };
}

Deno.test({
  name: "likes-profiles: injected avatar_url pointing at another user's path is not signed",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const attacker = await signUpUser("atk");
    const viewer = await signUpUser("viewer");
    const victim = await signUpUser("victim");
    if (
      !attacker.session || !attacker.userId ||
      !viewer.session || !viewer.userId ||
      !victim.userId
    ) {
      console.warn("Skipping: signup unavailable");
      return;
    }

    // Attacker sets avatar to a path under the victim's storage folder.
    const injectedPath = `${victim.userId}/stolen-avatar.jpg`;
    const { error: upErr } = await attacker.client
      .from("profiles")
      .update({ avatar_url: injectedPath })
      .eq("user_id", attacker.userId);
    if (upErr) {
      console.warn("Skipping: could not update attacker profile —", upErr.message);
      return;
    }

    // Create mutual likes so attacker appears in viewer's likes-profiles response.
    const { error: likeAErr } = await attacker.client
      .from("likes")
      .insert({ liker_id: attacker.userId, liked_id: viewer.userId });
    const { error: likeVErr } = await viewer.client
      .from("likes")
      .insert({ liker_id: viewer.userId, liked_id: attacker.userId });
    if (likeAErr || likeVErr) {
      console.warn(
        "Skipping: could not create likes —",
        likeAErr?.message,
        likeVErr?.message,
      );
      return;
    }

    const { status, json } = await callEdge("likes-profiles", viewer.session.access_token, {});
    assertEquals(status, 200, `likes-profiles should respond 200, got ${status}: ${JSON.stringify(json)}`);

    const buckets: any[] = [
      ...(Array.isArray(json?.sent) ? json.sent : []),
      ...(Array.isArray(json?.received) ? json.received : []),
    ];
    const attackerRow = buckets.find((p) => p?.user_id === attacker.userId);
    assert(attackerRow, "attacker profile should appear in viewer's likes response");

    assertEquals(
      attackerRow.avatar_url,
      null,
      `likes-profiles must not sign cross-user avatar path, got: ${attackerRow.avatar_url}`,
    );

    // Extra hardening: no signed URL in any liked profile should leak victim's id.
    for (const p of buckets) {
      if (typeof p?.avatar_url === "string") {
        assert(
          !p.avatar_url.includes(victim.userId!),
          `likes-profiles signed URL leaked victim id: ${p.avatar_url}`,
        );
      }
    }
  },
});
