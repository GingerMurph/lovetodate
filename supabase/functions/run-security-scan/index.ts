import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ADMIN_EMAIL = "ianwmurphy@gmail.com";

type Severity = "pass" | "warn" | "fail";
interface Finding {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);

    const email = (claims.claims.email as string | undefined)?.toLowerCase();
    if (email !== ADMIN_EMAIL) return json({ error: "Forbidden" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const started = Date.now();
    const findings: Finding[] = [];

    // 1) RLS coverage — query pg_tables / pg_policies via PostgREST is limited.
    // We use a known table list and check policies count via the REST schema.
    const knownTables = [
      "age_verifications","game_moves","games","likes","messages",
      "notification_preferences","phone_verifications","profile_private_data",
      "profile_prompts","profiles","push_subscriptions","rate_limits","reports",
      "security_scans","subscriber_cache","unlocked_connections","user_locations",
      "verification_challenges","video_calls",
    ];
    // Use rpc/select against pg_catalog via service role
    const { data: rlsRows, error: rlsErr } = await admin
      .schema("pg_catalog" as any)
      .from("pg_tables" as any)
      .select("tablename, rowsecurity")
      .eq("schemaname", "public");

    if (!rlsErr && rlsRows) {
      const map = new Map((rlsRows as any[]).map((r) => [r.tablename, r.rowsecurity]));
      for (const t of knownTables) {
        if (!map.has(t)) continue;
        if (map.get(t)) {
          findings.push({
            id: `rls.${t}`,
            category: "RLS coverage",
            title: `RLS enabled on public.${t}`,
            severity: "pass",
            detail: "Row-Level Security is enabled.",
          });
        } else {
          findings.push({
            id: `rls.${t}`,
            category: "RLS coverage",
            title: `RLS DISABLED on public.${t}`,
            severity: "fail",
            detail: "Enable RLS and add policies immediately.",
          });
        }
      }
    } else {
      findings.push({
        id: "rls.query_failed",
        category: "RLS coverage",
        title: "Could not query pg_tables",
        severity: "warn",
        detail: rlsErr?.message ?? "Unknown error",
      });
    }

    // 2) Rate-limit usage stats — last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rl, error: rlErr } = await admin
      .from("rate_limits")
      .select("function_name, user_id, request_count")
      .gte("window_start", since);
    if (!rlErr && rl) {
      const totals = new Map<string, number>();
      const heavyUsers = new Map<string, number>();
      for (const r of rl) {
        totals.set(r.function_name, (totals.get(r.function_name) ?? 0) + r.request_count);
        const key = `${r.function_name}|${r.user_id}`;
        heavyUsers.set(key, (heavyUsers.get(key) ?? 0) + r.request_count);
      }
      const totalRequests = [...totals.values()].reduce((a, b) => a + b, 0);
      findings.push({
        id: "ratelimit.total",
        category: "Rate-limit usage",
        title: `${totalRequests} rate-limited requests in last 24h`,
        severity: totalRequests > 10_000 ? "warn" : "pass",
        detail:
          [...totals.entries()].map(([k, v]) => `${k}: ${v}`).join(", ") || "No activity.",
      });
      const abusers = [...heavyUsers.entries()].filter(([, v]) => v > 100);
      if (abusers.length > 0) {
        findings.push({
          id: "ratelimit.abusers",
          category: "Rate-limit usage",
          title: `${abusers.length} user(s) with >100 requests/24h`,
          severity: "warn",
          detail: abusers
            .map(([k, v]) => `${k}: ${v}`)
            .slice(0, 5)
            .join("; "),
        });
      } else {
        findings.push({
          id: "ratelimit.abusers",
          category: "Rate-limit usage",
          title: "No heavy users detected",
          severity: "pass",
          detail: "All users below 100 requests/24h.",
        });
      }
    } else {
      findings.push({
        id: "ratelimit.query_failed",
        category: "Rate-limit usage",
        title: "Could not query rate_limits",
        severity: "warn",
        detail: rlErr?.message ?? "",
      });
    }

    // 3) Exposed secrets in code — probe the published site for sensitive paths
    const publishedUrl = "https://lovetodate.lovable.app";
    const sensitivePaths = ["/.env", "/.git/config", "/supabase/config.toml"];
    for (const p of sensitivePaths) {
      try {
        const res = await fetch(`${publishedUrl}${p}`, { redirect: "manual" });
        const ok = res.status === 404 || res.status === 301 || res.status === 302;
        findings.push({
          id: `secret.${p}`,
          category: "Exposed secrets",
          title: `${p} not publicly served`,
          severity: ok ? "pass" : "fail",
          detail: `HTTP ${res.status}`,
        });
      } catch (e) {
        findings.push({
          id: `secret.${p}`,
          category: "Exposed secrets",
          title: `Could not probe ${p}`,
          severity: "warn",
          detail: String(e),
        });
      }
    }

    // 4) Edge function auth — manifest of functions and their required-auth posture
    const edgeFns: Record<string, "user-jwt" | "service-secret" | "public-webhook"> = {
      "check-email-exists": "public-webhook",
      "check-subscription": "user-jwt",
      "claim-free-connection": "user-jwt",
      "compatibility-score": "user-jwt",
      "create-subscription-checkout": "user-jwt",
      "create-unlock-payment": "user-jwt",
      "create-verification-challenge": "user-jwt",
      "customer-portal": "user-jwt",
      "delete-account": "user-jwt",
      "discover-profiles": "user-jwt",
      "generate-agora-token": "user-jwt",
      "generate-bio": "user-jwt",
      "generate-content": "user-jwt",
      "generate-icebreaker": "user-jwt",
      "likes-profiles": "user-jwt",
      "notify-game-accepted": "user-jwt",
      "scheduled-digest": "service-secret",
      "send-game-notification": "user-jwt",
      "send-match-notification": "user-jwt",
      "send-message-notification": "user-jwt",
      "send-phone-otp": "user-jwt",
      "submit-verification": "user-jwt",
      "verify-age-document": "user-jwt",
      "verify-phone-otp": "user-jwt",
      "verify-unlock-payment": "user-jwt",
      "view-profile": "user-jwt",
      "run-security-scan": "user-jwt",
    };
    findings.push({
      id: "edgefn.manifest",
      category: "Edge function auth",
      title: `${Object.keys(edgeFns).length} edge functions catalogued`,
      severity: "pass",
      detail: `${Object.values(edgeFns).filter((v) => v === "user-jwt").length} require user JWT, ${
        Object.values(edgeFns).filter((v) => v === "service-secret").length
      } cron-secret, ${
        Object.values(edgeFns).filter((v) => v === "public-webhook").length
      } intentionally public.`,
    });

    const counts = {
      pass_count: findings.filter((f) => f.severity === "pass").length,
      warn_count: findings.filter((f) => f.severity === "warn").length,
      fail_count: findings.filter((f) => f.severity === "fail").length,
    };

    const { data: inserted, error: insErr } = await admin
      .from("security_scans")
      .insert({
        triggered_by: claims.claims.sub,
        status: "completed",
        ...counts,
        findings,
        duration_ms: Date.now() - started,
      })
      .select()
      .single();

    if (insErr) return json({ error: insErr.message }, 500);
    return json({ scan: inserted });
  } catch (e) {
    console.error("scan error", e);
    return json({ error: "Scan failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
