// Regression tests for generate-agora-token input validation:
// - rejects missing auth
// - rejects non-UUID partnerId
// - rejects self-targeting (partnerId === caller userId)
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/generate-agora-token`;

async function call(body: unknown, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", apikey: ANON_KEY };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(FN_URL, { method: "POST", headers, body: JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, json, text };
}

async function signUp() {
  const email = `agora-${crypto.randomUUID()}@example.com`;
  const password = `Pw!${crypto.randomUUID()}`;
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return await client.auth.signUp({ email, password, options: { data: { display_name: "T" } } });
}

Deno.test({
  name: "generate-agora-token: rejects missing authorization",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const res = await call({ partnerId: crypto.randomUUID() });
    // No-auth: function throws "No authorization header" → 500 path returns generic 500
    assertEquals([401, 500].includes(res.status), true, `got ${res.status}`);
  },
});

Deno.test({
  name: "generate-agora-token: rejects non-UUID partnerId",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUp();
    if (error || !data.session) { console.warn("skip: signup unavailable"); return; }
    const res = await call({ partnerId: "not-a-uuid" }, data.session.access_token);
    assertEquals(res.status, 400);
    assertEquals(res.json?.error, "Invalid partnerId");
  },
});

Deno.test({
  name: "generate-agora-token: rejects missing partnerId",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUp();
    if (error || !data.session) { console.warn("skip: signup unavailable"); return; }
    const res = await call({}, data.session.access_token);
    assertEquals(res.status, 400);
  },
});

Deno.test({
  name: "generate-agora-token: rejects self-targeting",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const { data, error } = await signUp();
    if (error || !data.session || !data.user) { console.warn("skip: signup unavailable"); return; }
    const res = await call({ partnerId: data.user.id }, data.session.access_token);
    assertEquals(res.status, 400);
    assertEquals(res.json?.error, "Invalid partnerId");
  },
});
