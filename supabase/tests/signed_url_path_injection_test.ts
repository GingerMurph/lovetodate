// Integration test: verifies edge functions refuse to sign storage URLs for
// paths that don't belong to the profile owner (signed URL path injection).
//
// Attack model:
//   1. Attacker signs up as user A.
//   2. Attacker updates their own profile's avatar_url / photo_urls /
//      voice_intro_url to a storage path that starts with another user's id
//      (e.g. "victim-uuid/photo.jpg").
//   3. Any authenticated user calls view-profile / discover-profiles /
//      likes-profiles for attacker A.
//   4. Edge function must NOT return a signed URL that points into
//      victim-uuid/... — the path-prefix guard added in the fix must reject it.
//
// The guard in all three functions is:
//   if (!path.startsWith(`${ownerId}/`)) return null;
// so any injected path must come back as null in the response.
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
    email: `sup-${tag}-${crypto.randomUUID()}@example.com`,
    password: `Pw!${crypto.randomUUID()}`,
    options: { data: { display_name: `PathInject ${tag}` } },
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
  name: "view-profile: injected avatar_url pointing at another user's path is not signed",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const attacker = await signUpUser("atk-avatar");
    const victim = await signUpUser("victim-avatar");
    const viewer = await signUpUser("viewer-avatar");
    if (!attacker.session || !attacker.userId || !victim.userId || !viewer.session) {
      console.warn("Skipping: signup unavailable");
      return;
    }

    // Attacker sets avatar_url to a path under the victim's storage folder.
    const injectedPath = `${victim.userId}/stolen-avatar.jpg`;
    const { error: upErr } = await attacker.client
      .from("profiles")
      .update({ avatar_url: injectedPath })
      .eq("user_id", attacker.userId);
    if (upErr) {
      console.warn("Skipping: could not update attacker profile —", upErr.message);
      return;
    }

    // Viewer requests attacker's profile.
    const { status, json } = await callEdge("view-profile", viewer.session.access_token, {
      userId: attacker.userId,
    });
    assertEquals(status, 200, `view-profile should respond 200, got ${status}: ${JSON.stringify(json)}`);

    const returnedAvatar = json?.profile?.avatar_url ?? null;
    assertEquals(
      returnedAvatar,
      null,
      `injected cross-user path must not be signed, got: ${returnedAvatar}`,
    );

    // Extra hardening: even if some URL slipped through, it must not reference victim's path.
    if (typeof returnedAvatar === "string") {
      assert(
        !returnedAvatar.includes(victim.userId),
        `signed URL leaked victim id: ${returnedAvatar}`,
      );
    }
  },
});

Deno.test({
  name: "view-profile: injected photo_urls entries pointing at another user's path are stripped",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const attacker = await signUpUser("atk-photos");
    const victim = await signUpUser("victim-photos");
    const viewer = await signUpUser("viewer-photos");
    if (!attacker.session || !attacker.userId || !victim.userId || !viewer.session) {
      console.warn("Skipping: signup unavailable");
      return;
    }

    const injected = [
      `${victim.userId}/stolen-1.jpg`,
      `${victim.userId}/stolen-2.jpg`,
    ];
    const { error: upErr } = await attacker.client
      .from("profiles")
      .update({ photo_urls: injected })
      .eq("user_id", attacker.userId);
    if (upErr) {
      console.warn("Skipping: could not update attacker photo_urls —", upErr.message);
      return;
    }

    const { status, json } = await callEdge("view-profile", viewer.session.access_token, {
      userId: attacker.userId,
    });
    assertEquals(status, 200, `view-profile should respond 200, got ${status}`);

    const photos: string[] = Array.isArray(json?.profile?.photo_urls) ? json.profile.photo_urls : [];
    for (const url of photos) {
      assert(
        typeof url !== "string" || !url.includes(victim.userId),
        `photo signed URL leaked victim id: ${url}`,
      );
    }
    // With the guard in place both entries fail the prefix check → filtered out.
    assertEquals(photos.length, 0, `expected all injected photo paths to be dropped, got ${photos.length}`);
  },
});

Deno.test({
  name: "view-profile: injected voice_intro_url pointing at another user's path is not signed",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const attacker = await signUpUser("atk-voice");
    const victim = await signUpUser("victim-voice");
    const viewer = await signUpUser("viewer-voice");
    if (!attacker.session || !attacker.userId || !victim.userId || !viewer.session) {
      console.warn("Skipping: signup unavailable");
      return;
    }

    const injectedVoice = `${victim.userId}/stolen-intro.webm`;
    const { error: upErr } = await attacker.client
      .from("profiles")
      .update({ voice_intro_url: injectedVoice })
      .eq("user_id", attacker.userId);
    if (upErr) {
      console.warn("Skipping: could not update attacker voice_intro_url —", upErr.message);
      return;
    }

    const { status, json } = await callEdge("view-profile", viewer.session.access_token, {
      userId: attacker.userId,
    });
    assertEquals(status, 200, `view-profile should respond 200, got ${status}`);

    const voiceUrl = json?.profile?.voice_intro_url ?? null;
    assertEquals(
      voiceUrl,
      null,
      `injected cross-user voice path must not be signed, got: ${voiceUrl}`,
    );
    if (typeof voiceUrl === "string") {
      assert(!voiceUrl.includes(victim.userId), `voice signed URL leaked victim id: ${voiceUrl}`);
    }
  },
});

Deno.test({
  name: "discover-profiles: attacker with injected avatar path never surfaces victim's signed URL",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const attacker = await signUpUser("atk-disc");
    const victim = await signUpUser("victim-disc");
    const viewer = await signUpUser("viewer-disc");
    if (!attacker.session || !attacker.userId || !victim.userId || !viewer.session) {
      console.warn("Skipping: signup unavailable");
      return;
    }

    const injectedPath = `${victim.userId}/stolen-avatar.jpg`;
    const { error: upErr } = await attacker.client
      .from("profiles")
      .update({
        avatar_url: injectedPath,
        photo_urls: [`${victim.userId}/stolen-2.jpg`],
      })
      .eq("user_id", attacker.userId);
    if (upErr) {
      console.warn("Skipping: could not update attacker profile —", upErr.message);
      return;
    }

    const { status, json } = await callEdge("discover-profiles", viewer.session.access_token, {});
    assertEquals(status, 200, `discover-profiles should respond 200, got ${status}`);

    const rows: any[] = Array.isArray(json) ? json : [];
    const attackerRow = rows.find((r) => r?.user_id === attacker.userId);
    if (!attackerRow) {
      // Discovery might filter by compat score / paused — that's fine, nothing was signed.
      return;
    }
    assertEquals(
      attackerRow.avatar_url,
      null,
      `discover-profiles must not sign cross-user avatar, got: ${attackerRow.avatar_url}`,
    );
    const photos: string[] = Array.isArray(attackerRow.photo_urls) ? attackerRow.photo_urls : [];
    for (const url of photos) {
      assert(
        typeof url !== "string" || !url.includes(victim.userId),
        `discover photo signed URL leaked victim id: ${url}`,
      );
    }
    assertEquals(photos.length, 0, `expected injected discover photo paths to be dropped, got ${photos.length}`);
  },
});
