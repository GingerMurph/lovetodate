import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Require authenticated user to prevent abuse of AI credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Simple per-user rate limit using rate_limits table
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);
    const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("function_name", "generate-content")
      .gte("window_start", windowStart);
    if ((count ?? 0) >= 30) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await admin.from("rate_limits").insert({ user_id: user.id, function_name: "generate-content" });

    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Validate type against allowlist
    const ALLOWED_TYPES = ["testimonial", "dating_advice", "blog", "conversation_starters"] as const;
    if (typeof type !== "string" || !ALLOWED_TYPES.includes(type as typeof ALLOWED_TYPES[number])) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate prompt: must be string, max 500 chars
    if (typeof prompt !== "string" || prompt.length === 0 || prompt.length > 500) {
      return new Response(JSON.stringify({ error: "Prompt must be a non-empty string of 500 characters or fewer" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strip role markers / control chars to mitigate prompt injection
    const sanitizedPrompt = sanitizePrompt(prompt);

    let systemPrompt = "";
    if (type === "testimonial") {
      systemPrompt = "You generate realistic dating app testimonials. Return JSON: {\"content\": \"...\", \"name\": \"FirstName, Age, City\"}. Keep testimonials warm and genuine.";
    } else if (type === "dating_advice") {
      systemPrompt = "You generate dating advice. Return JSON: {\"items\": [{\"title\": \"...\", \"content\": \"...\"}]}. Keep tips practical and kind.";
    } else if (type === "blog") {
      systemPrompt = "You generate dating blog post ideas. Return JSON: {\"items\": [{\"title\": \"...\", \"excerpt\": \"...\", \"category\": \"...\"}]}.";
    } else if (type === "conversation_starters") {
      systemPrompt = "You generate conversation starters for dating. Return JSON: {\"items\": [\"question1\", \"question2\", ...]}. Make them fun and creative.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sanitizedPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
