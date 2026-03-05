import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    if (type === "testimonial") {
      systemPrompt = "You generate realistic dating app testimonials. Return JSON: {\"content\": \"...\", \"name\": \"FirstName, Age, City\"}. Keep testimonials warm and genuine.";
    } else if (type === "dating_advice") {
      systemPrompt = "You generate dating advice. Return JSON: {\"items\": [{\"title\": \"...\", \"content\": \"...\"}]}. Keep tips practical and kind.";
    } else if (type === "blog") {
      systemPrompt = "You generate dating blog post ideas. Return JSON: {\"items\": [{\"title\": \"...\", \"excerpt\": \"...\", \"category\": \"...\"}]}.";
    } else if (type === "conversation_starters") {
      systemPrompt = "You generate conversation starters for dating. Return JSON: {\"items\": [\"question1\", \"question2\", ...]}. Make them fun and creative.";
    } else {
      systemPrompt = "You are a helpful assistant for a dating app. Return JSON.";
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
          { role: "user", content: prompt },
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
