import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 20 bio generation requests per hour
    const rateCheck = await checkRateLimit(user.id, {
      functionName: "generate-bio",
      maxRequests: 20,
      windowMinutes: 60,
    });
    if (!rateCheck.allowed) return rateLimitResponse(corsHeaders);

    const { tone } = await req.json();
    const validTones = ["witty", "sincere", "adventurous", "chill"];
    const selectedTone = validTones.includes(tone) ? tone : "sincere";

    // Fetch user's profile to personalize the bio
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name, gender, occupation, education, interests, favourite_music, favourite_film, favourite_sport, favourite_hobbies, pets, personality_type, relationship_goal, smoking, drinking, children, religion, nationality, location_city")
      .eq("user_id", user.id)
      .maybeSingle();

    // Build context from profile
    const details: string[] = [];
    if (profile) {
      if (profile.display_name) details.push(`Name: ${profile.display_name}`);
      if (profile.gender) details.push(`Gender: ${profile.gender}`);
      if (profile.occupation) details.push(`Job: ${profile.occupation}`);
      if (profile.education) details.push(`Education: ${profile.education}`);
      if (profile.interests?.length) details.push(`Interests: ${profile.interests.join(", ")}`);
      if (profile.favourite_music?.length) details.push(`Music: ${profile.favourite_music.join(", ")}`);
      if (profile.favourite_film?.length) details.push(`Films: ${profile.favourite_film.join(", ")}`);
      if (profile.favourite_sport?.length) details.push(`Sports: ${profile.favourite_sport.join(", ")}`);
      if (profile.favourite_hobbies?.length) details.push(`Hobbies: ${profile.favourite_hobbies.join(", ")}`);
      if (profile.pets) details.push(`Pets: ${profile.pets}`);
      if (profile.personality_type) details.push(`Personality: ${profile.personality_type}`);
      if (profile.relationship_goal?.length) details.push(`Looking for: ${profile.relationship_goal.join(", ")}`);
      if (profile.location_city) details.push(`City: ${profile.location_city}`);
    }

    const profileContext = details.length > 0
      ? details.join("\n")
      : "No profile details provided yet.";

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toneDescriptions: Record<string, string> = {
      witty: "clever, playful, with a dash of humor and wordplay",
      sincere: "warm, genuine, heartfelt and authentic",
      adventurous: "bold, exciting, emphasizing experiences and spontaneity",
      chill: "laid-back, relaxed, easy-going and approachable",
    };

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a dating profile bio writer for "Love To Date". Write exactly 3 different bio options. Each bio should be ${toneDescriptions[selectedTone]}. Keep each bio between 80-200 characters. Make them feel personal, not generic. Use first person. Don't use clichés like "partner in crime" or "swipe right".`,
          },
          {
            role: "user",
            content: `Write 3 dating bios based on this profile info:\n${profileContext}`,
          },
        ],
        max_tokens: 500,
        tools: [
          {
            type: "function",
            function: {
              name: "return_bios",
              description: "Return 3 bio suggestions",
              parameters: {
                type: "object",
                properties: {
                  bios: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["bios"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_bios" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate bios" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    let bios: string[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        bios = parsed.bios || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    if (bios.length === 0) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try { bios = JSON.parse(content); } catch { /* fallback below */ }
      }
    }

    if (bios.length === 0) {
      bios = [
        "Life's too short for boring conversations. Let's make it interesting. ✨",
        "Looking for genuine connection and good laughs along the way.",
        "Here for real conversations, spontaneous plans, and someone who gets it.",
      ];
    }

    return new Response(JSON.stringify({ bios }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-bio error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
