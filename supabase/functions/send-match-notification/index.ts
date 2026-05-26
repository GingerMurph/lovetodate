import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logAuditRejection } from "../_shared/audit-log.ts";

const FUNCTION_NAME = "send-match-notification";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Build a Web Push payload and send it using the Web Push protocol.
 * Uses VAPID with the p256ecdsa algorithm (RFC 8292 / RFC 8291).
 */
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
) {
  // --- Helpers ---
  function base64UrlDecode(str: string): Uint8Array {
    const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
    const base64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(base64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  function base64UrlEncode(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function concat(...arrays: Uint8Array[]): Uint8Array {
    const len = arrays.reduce((s, a) => s + a.length, 0);
    const result = new Uint8Array(len);
    let offset = 0;
    for (const a of arrays) {
      result.set(a, offset);
      offset += a.length;
    }
    return result;
  }

  // --- VAPID JWT ---
  const audience = new URL(subscription.endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = { aud: audience, exp: now + 60 * 60 * 12, sub: vapidSubject };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(jwtPayload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyRaw = base64UrlDecode(vapidPrivateKey);
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: base64UrlEncode(privateKeyRaw),
    x: base64UrlEncode(base64UrlDecode(vapidPublicKey).slice(1, 33)),
    y: base64UrlEncode(base64UrlDecode(vapidPublicKey).slice(33, 65)),
  };

  const signingKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, signingKey, new TextEncoder().encode(unsignedToken));
  // Convert DER to raw r||s if needed
  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes[0] === 0x30) {
    // DER encoded
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    r = sigBytes.slice(offset + 2, offset + 2 + rLen);
    offset += 2 + rLen;
    const sLen = sigBytes[offset + 1];
    s = sigBytes.slice(offset + 2, offset + 2 + sLen);
    // Pad/trim to 32 bytes
    if (r.length > 32) r = r.slice(r.length - 32);
    if (s.length > 32) s = s.slice(s.length - 32);
    if (r.length < 32) r = concat(new Uint8Array(32 - r.length), r);
    if (s.length < 32) s = concat(new Uint8Array(32 - s.length), s);
  } else {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  }
  const jwt = `${unsignedToken}.${base64UrlEncode(concat(r, s))}`;

  // --- Encrypt payload (RFC 8291 aes128gcm) ---
  const userPublicKeyBytes = base64UrlDecode(subscription.p256dh);
  const userAuthBytes = base64UrlDecode(subscription.auth);

  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const userPublicKey = await crypto.subtle.importKey("raw", userPublicKeyBytes, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userPublicKey }, localKeyPair.privateKey, 256));

  // HKDF helper
  async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
    const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt.length ? salt : new Uint8Array(32)));
    const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const infoLen = new Uint8Array([0, len]);
    const t = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, concat(info, new Uint8Array([1]))));
    return t.slice(0, len);
  }

  // Actually, the HKDF for web push uses the auth secret as salt for the first extraction
  async function hkdfWebPush(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = new Uint8Array(await crypto.subtle.sign("HMAC", keyMaterial, ikm));
    const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const t = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, concat(info, new Uint8Array([1]))));
    return t.slice(0, len);
  }

  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const ikm_info = concat(authInfo, userPublicKeyBytes, localPublicKeyRaw);
  const ikm = await hkdfWebPush(userAuthBytes, sharedSecret, ikm_info, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const contentEncKeyInfo = concat(new TextEncoder().encode("Content-Encoding: aes128gcm\0"), new Uint8Array([0]));
  const nonceInfo = concat(new TextEncoder().encode("Content-Encoding: nonce\0"), new Uint8Array([0]));

  const cek = await hkdf(salt, ikm, contentEncKeyInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = concat(payloadBytes, new Uint8Array([2])); // delimiter

  const encKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encKey, paddedPayload));

  // Build aes128gcm header: salt(16) + rs(4) + idLen(1) + keyId(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header_bytes = concat(salt, rs, new Uint8Array([65]), localPublicKeyRaw);
  const body = concat(header_bytes, encrypted);

  // --- Send ---
  const vapidPublicKeyB64 = base64UrlEncode(base64UrlDecode(vapidPublicKey));

  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${vapidPublicKeyB64}`,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Push failed [${response.status}]: ${text}`);
  }
  return response;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      await logAuditRejection({
        functionName: FUNCTION_NAME,
        userId: null,
        reasonCode: "missing_auth_header",
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      await logAuditRejection({
        functionName: FUNCTION_NAME,
        userId: null,
        reasonCode: "invalid_jwt",
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { matched_user_id } = await req.json();
    if (!matched_user_id || typeof matched_user_id !== "string") {
      await logAuditRejection({
        functionName: FUNCTION_NAME,
        userId: user.id,
        reasonCode: "missing_matched_user_id",
      });
      return new Response(JSON.stringify({ error: "matched_user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!UUID_REGEX.test(matched_user_id) || matched_user_id === user.id) {
      await logAuditRejection({
        functionName: FUNCTION_NAME,
        userId: user.id,
        reasonCode: matched_user_id === user.id ? "self_target" : "invalid_matched_user_id",
        details: { matched_user_id },
      });
      return new Response(JSON.stringify({ error: "Invalid matched_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    const [callerLike, matchedLike] = await Promise.all([
      adminClient
        .from("likes")
        .select("id")
        .eq("liker_id", user.id)
        .eq("liked_id", matched_user_id)
        .maybeSingle(),
      adminClient
        .from("likes")
        .select("id")
        .eq("liker_id", matched_user_id)
        .eq("liked_id", user.id)
        .maybeSingle(),
    ]);

    if (!callerLike.data || !matchedLike.data) {
      await logAuditRejection({
        functionName: FUNCTION_NAME,
        userId: user.id,
        reasonCode: "not_mutual_match",
        details: {
          matched_user_id,
          caller_liked_target: !!callerLike.data,
          target_liked_caller: !!matchedLike.data,
        },
      });
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the caller's display name
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    const callerName = callerProfile?.display_name || "Someone";

    // Get push subscriptions for the matched user
    const { data: subscriptions } = await adminClient
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", matched_user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pushPayload = JSON.stringify({
      title: "💕 It's a Match!",
      body: `You and ${callerName} both like each other!`,
      url: "/likes",
    });

    let sent = 0;
    const staleEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        await sendWebPush(sub, pushPayload, vapidPublicKey, vapidPrivateKey, "mailto:support@lovetodate.co.uk");
        sent++;
      } catch (e) {
        console.error("Push send error:", e);
        // If 404 or 410, subscription is stale — mark for cleanup
        const msg = (e as Error).message || "";
        if (msg.includes("410") || msg.includes("404")) {
          staleEndpoints.push(sub.endpoint);
        }
      }
    }

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await adminClient
        .from("push_subscriptions")
        .delete()
        .eq("user_id", matched_user_id)
        .in("endpoint", staleEndpoints);
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-match-notification error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
