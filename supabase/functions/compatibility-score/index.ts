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

    const rateCheck = await checkRateLimit(user.id, {
      functionName: "compatibility-score",
      maxRequests: 60,
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

    const profileFields = "display_name, bio, interests, relationship_goal, looking_for, gender, smoking, drinking, children, religion, ethnicity, pets, political_beliefs, personality_type, favourite_music, favourite_film, favourite_sport, favourite_hobbies, occupation, education, languages";

    const [partnerRes, selfRes, sharedGamesRes] = await Promise.all([
      adminClient.from("profiles").select(profileFields).eq("user_id", partnerId).maybeSingle(),
      adminClient.from("profiles").select(profileFields).eq("user_id", user.id).maybeSingle(),
      adminClient.from("games").select("game_state")
        .eq("game_type", "hypothetical_questions")
        .eq("status", "completed")
        .or(`and(creator_id.eq.${user.id},opponent_id.eq.${partnerId}),and(creator_id.eq.${partnerId},opponent_id.eq.${user.id})`),
    ]);

    if (!partnerRes.data || !selfRes.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract hypothetical question match data
    let gameMatchSummary = "";
    if (sharedGamesRes.data?.length) {
      let totalQs = 0;
      let matchedQs = 0;
      for (const game of sharedGamesRes.data) {
        const answers = (game.game_state as any)?.answers || {};
        for (const qIndex of Object.keys(answers)) {
          const qa = answers[qIndex];
          const players = Object.keys(qa);
          if (players.length === 2) {
            totalQs++;
            if (qa[players[0]] === qa[players[1]]) matchedQs++;
          }
        }
      }
      if (totalQs > 0) {
        gameMatchSummary = `\n\nHypothetical Questions Game Data: They played ${sharedGamesRes.data.length} game(s) with ${totalQs} questions total. They matched on ${matchedQs} out of ${totalQs} answers (${Math.round((matchedQs / totalQs) * 100)}% agreement). This shows real-world compatibility — weight this meaningfully in your score.`;
      }
    }

    const formatProfile = (p: Record<string, unknown>) => {
      const lines: string[] = [];
      if (p.bio) lines.push(`Bio: ${(p.bio as string).substring(0, 200)}`);
      if (p.interests && (p.interests as string[]).length) lines.push(`Interests: ${(p.interests as string[]).join(", ")}`);
      if (p.relationship_goal) lines.push(`Relationship goal: ${Array.isArray(p.relationship_goal) ? (p.relationship_goal as string[]).join(", ") : p.relationship_goal}`);
      if (p.looking_for) lines.push(`Looking for: ${p.looking_for}`);
      if (p.smoking) lines.push(`Smoking: ${p.smoking}`);
      if (p.drinking) lines.push(`Drinking: ${p.drinking}`);
      if (p.children) lines.push(`Children: ${p.children}`);
      if (p.religion) lines.push(`Religion: ${p.religion}`);
      if (p.pets) lines.push(`Pets: ${p.pets}`);
      if (p.political_beliefs) lines.push(`Politics: ${p.political_beliefs}`);
      if (p.personality_type) lines.push(`Personality: ${p.personality_type}`);
      if (p.favourite_music && (p.favourite_music as string[]).length) lines.push(`Music: ${(p.favourite_music as string[]).join(", ")}`);
      if (p.favourite_film && (p.favourite_film as string[]).length) lines.push(`Films: ${(p.favourite_film as string[]).join(", ")}`);
      if (p.favourite_sport && (p.favourite_sport as string[]).length) lines.push(`Sports: ${(p.favourite_sport as string[]).join(", ")}`);
      if (p.favourite_hobbies && (p.favourite_hobbies as string[]).length) lines.push(`Hobbies: ${(p.favourite_hobbies as string[]).join(", ")}`);
      if (p.occupation) lines.push(`Occupation: ${p.occupation}`);
      if (p.education) lines.push(`Education: ${p.education}`);
      if (p.languages && (p.languages as string[]).length) lines.push(`Languages: ${(p.languages as string[]).join(", ")}`);
      return lines.join("\n");
    };

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
            content: `You are a dating compatibility analyst for an app called "Love To Date". Given two user profiles, analyze their compatibility across these dimensions: shared interests, lifestyle alignment (smoking, drinking, children, pets), values (religion, politics), personality, relationship goals, and any hypothetical question game results (which show real decision-making alignment). Return a score from 0-100 and a brief fun summary (max 120 chars) explaining the match. Be encouraging but honest. If game data is provided, weight matching answers positively — it shows genuine compatibility.`,
          },
          {
            role: "user",
            content: `User A:\n${formatProfile(selfRes.data)}\n\nUser B (${partnerRes.data.display_name}):\n${formatProfile(partnerRes.data)}${gameMatchSummary}`,
          },
        ],
        max_tokens: 300,
        tools: [
          {
            type: "function",
            function: {
              name: "return_compatibility",
              description: "Return compatibility score and summary",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", minimum: 0, maximum: 100, description: "Compatibility score 0-100" },
                  summary: { type: "string", description: "Brief fun summary of compatibility, max 120 chars" },
                },
                required: ["score", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_compatibility" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", aiResponse.status, await aiResponse.text());
      return new Response(JSON.stringify({ error: "Failed to generate score" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    let score = 50;
    let summary = "You two could be a great match! 💫";

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (typeof parsed.score === "number") score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        if (typeof parsed.summary === "string") summary = parsed.summary;
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify({ score, summary, hasGameData: !!gameMatchSummary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("compatibility-score error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
