import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  functionName: string;
  maxRequests: number;
  windowMinutes: number;
}

export async function checkRateLimit(
  userId: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number }> {
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const windowStart = new Date(
    Date.now() - config.windowMinutes * 60 * 1000
  ).toISOString();

  // Count requests in current window
  const { count } = await adminClient
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("function_name", config.functionName)
    .gte("window_start", windowStart);

  const currentCount = count ?? 0;

  if (currentCount >= config.maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Record this request
  await adminClient.from("rate_limits").insert({
    user_id: userId,
    function_name: config.functionName,
  });

  return { allowed: true, remaining: config.maxRequests - currentCount - 1 };
}

export function rateLimitResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
