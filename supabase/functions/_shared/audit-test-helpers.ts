// Test helpers for verifying security_audit_log entries.
// If SUPABASE_SERVICE_ROLE_KEY is available in the environment, helpers will
// query the audit table directly. Otherwise they no-op so HTTP-only regression
// tests can still run locally without exposing the service role key.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function getAuditAdminClient(): SupabaseClient | null {
  const url = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Poll the audit log for a matching row. Returns the row if found within the
 * timeout, otherwise null. Returns null immediately when no service role key
 * is configured (so tests degrade gracefully).
 */
export async function findAuditRow(params: {
  functionName: string;
  reasonCode: string;
  userId?: string | null;
  sinceIso: string;
  timeoutMs?: number;
}): Promise<Record<string, unknown> | null> {
  const admin = getAuditAdminClient();
  if (!admin) return null;

  const deadline = Date.now() + (params.timeoutMs ?? 4000);
  while (Date.now() < deadline) {
    let q = admin
      .from("security_audit_log")
      .select("id, function_name, user_id, reason_code, details, created_at")
      .eq("function_name", params.functionName)
      .eq("reason_code", params.reasonCode)
      .gte("created_at", params.sinceIso)
      .order("created_at", { ascending: false })
      .limit(1);
    if (params.userId !== undefined) {
      q = params.userId === null ? q.is("user_id", null) : q.eq("user_id", params.userId);
    }
    const { data } = await q;
    if (data && data.length > 0) return data[0] as Record<string, unknown>;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

export function hasServiceRoleKey(): boolean {
  return !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
}
