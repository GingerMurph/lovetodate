import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Insert a security audit log entry for a rejected/denied request.
 * Failures here are swallowed and only logged to the function logs —
 * audit logging must never break the user-facing response path.
 */
export async function logAuditRejection(params: {
  functionName: string;
  userId: string | null;
  reasonCode: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return;

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.from("security_audit_log").insert({
      function_name: params.functionName,
      user_id: params.userId,
      reason_code: params.reasonCode,
      details: params.details ?? {},
    });
    if (error) {
      console.error(`[AUDIT-LOG] insert failed for ${params.functionName}/${params.reasonCode}:`, error.message);
    }
  } catch (err) {
    console.error("[AUDIT-LOG] unexpected error:", err);
  }
}
