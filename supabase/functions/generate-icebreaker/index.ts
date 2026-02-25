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

    // Rate limit: 30 icebreaker requests per hour
    const rateCheck = await checkRateLimit(user.id, {
      functionName: "generate-icebreaker",
      maxRequests: 30,
      windowMinutes: 60,
    });
    if (!rateCheck.allowed) return rateLimitResponse(corsHeaders);

    const { partnerId } = await req.json();
    if (!partnerId || typeof partnerId !== "string") {
      return new Response(JSON.stringify({ error: "partnerId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(partnerId)) {
      return new Response(JSON.stringify({ error: "Invalid partnerId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch both profiles in parallel
    const [partnerRes, senderRes] = await Promise.all([
      adminClient.from("profiles")
        .select("display_name, bio, interests, favourite_music, favourite_film, favourite_sport, favourite_hobbies, occupation, pets, personality_type")
        .eq("user_id", partnerId)
        .maybeSingle(),
      adminClient.from("profiles")
        .select("display_name, interests, favourite_music, favourite_film, favourite_sport, favourite_hobbies")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (!partnerRes.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partner = partnerRes.data;
    const sender = senderRes.data;

    // Build context about the partner
    const profileDetails: string[] = [];
    if (partner.bio) profileDetails.push(`Bio: ${partner.bio.substring(0, 200)}`);
    if (partner.interests?.length) profileDetails.push(`Interests: ${partner.interests.join(", ")}`);
    if (partner.favourite_music?.length) profileDetails.push(`Music: ${partner.favourite_music.join(", ")}`);
    if (partner.favourite_film?.length) profileDetails.push(`Films: ${partner.favourite_film.join(", ")}`);
    if (partner.favourite_sport?.length) profileDetails.push(`Sports: ${partner.favourite_sport.join(", ")}`);
    if (partner.favourite_hobbies?.length) profileDetails.push(`Hobbies: ${partner.favourite_hobbies.join(", ")}`);
    if (partner.occupation) profileDetails.push(`Occupation: ${partner.occupation}`);
    if (partner.pets) profileDetails.push(`Pets: ${partner.pets}`);
    if (partner.personality_type) profileDetails.push(`Personality: ${partner.personality_type}`);

    // Find shared interests
    const sharedInterests: string[] = [];
    if (sender?.interests && partner.interests) {
      const shared = sender.interests.filter((i: string) => partner.interests?.includes(i));
      if (shared.length) sharedInterests.push(`Shared interests: ${shared.join(", ")}`);
    }

    const profileContext = profileDetails.length > 0
      ? profileDetails.join("\n")
      : "No detailed profile info available";

    const sharedContext = sharedInterests.length > 0
      ? `\n\nThings you have in common:\n${sharedInterests.join("\n")}`
      : "";

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: `You are helping a user start a conversation on a dating app called "Love To Date". Generate exactly 3 fun, creative icebreaker messages they could send. Each should be personalized based on the match's profile. Keep them flirty but respectful, casual, and under 150 characters each. Return ONLY a JSON array of 3 strings, no other text.`,
          },
          {
            role: "user",
            content: `Match's name: ${partner.display_name}\n\nTheir profile:\n${profileContext}${sharedContext}`,
          },
        ],
        max_tokens: 400,
        tools: [
          {
            type: "function",
            function: {
              name: "return_icebreakers",
              description: "Return 3 icebreaker message suggestions",
              parameters: {
                type: "object",
                properties: {
                  icebreakers: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["icebreakers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_icebreakers" } },
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
      return new Response(JSON.stringify({ error: "Failed to generate suggestions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();

    // Extract from tool call response
    let icebreakers: string[] = [];
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        icebreakers = parsed.icebreakers || [];
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Fallback: try to parse content directly
    if (icebreakers.length === 0) {
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        try {
          icebreakers = JSON.parse(content);
        } catch {
          icebreakers = [
            `Hey ${partner.display_name}! What's the best thing that happened to you this week? 😊`,
            `Hi ${partner.display_name}! If you could travel anywhere tomorrow, where would you go? ✈️`,
            `Hey! I'd love to hear more about you. What's your go-to way to unwind? 💫`,
          ];
        }
      }
    }

    return new Response(JSON.stringify({ icebreakers }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-icebreaker error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
