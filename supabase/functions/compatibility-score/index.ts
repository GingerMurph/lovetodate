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

    const profileFields = "display_name, bio, interests, relationship_goal, looking_for, gender, smoking, drinking, children, religion, ethnicity, pets, political_beliefs, personality_type, favourite_music, favourite_film, favourite_sport, favourite_hobbies, occupation, education, languages, non_negotiables, body_build, height_cm";

    const [partnerRes, selfRes, sharedGamesRes, promptsA, promptsB] = await Promise.all([
      adminClient.from("profiles").select(profileFields).eq("user_id", partnerId).maybeSingle(),
      adminClient.from("profiles").select(profileFields).eq("user_id", user.id).maybeSingle(),
      adminClient.from("games").select("game_state")
        .eq("game_type", "hypothetical_questions")
        .eq("status", "completed")
        .or(`and(creator_id.eq.${user.id},opponent_id.eq.${partnerId}),and(creator_id.eq.${partnerId},opponent_id.eq.${user.id})`),
      adminClient.from("profile_prompts").select("prompt_text, answer_text").eq("user_id", user.id).limit(3),
      adminClient.from("profile_prompts").select("prompt_text, answer_text").eq("user_id", partnerId).limit(3),
    ]);

    if (!partnerRes.data || !selfRes.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract hypothetical question match data
    let gameMatchSummary = "";
    let gameMatchPercent = 0;
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
        gameMatchPercent = Math.round((matchedQs / totalQs) * 100);
        gameMatchSummary = `\n\n**HYPOTHETICAL QUESTIONS GAME DATA (IMPORTANT - this shows real decision-making compatibility):**
They played ${sharedGamesRes.data.length} game(s) with ${totalQs} hypothetical scenario questions.
Match rate: ${matchedQs}/${totalQs} (${gameMatchPercent}% agreement on tough decisions).
This is CRITICAL data - it reveals how they actually think and make decisions together. Weight this heavily.`;
      }
    }

    const formatProfile = (p: Record<string, unknown>, prompts: any[]) => {
      const lines: string[] = [];
      if (p.bio) lines.push(`Bio: ${(p.bio as string).substring(0, 300)}`);
      if (p.interests && (p.interests as string[]).length) lines.push(`Interests: ${(p.interests as string[]).join(", ")}`);
      if (p.relationship_goal) lines.push(`Relationship goal: ${Array.isArray(p.relationship_goal) ? (p.relationship_goal as string[]).join(", ") : p.relationship_goal}`);
      if (p.looking_for) lines.push(`Looking for: ${p.looking_for}`);
      if (p.smoking) lines.push(`Smoking: ${p.smoking}`);
      if (p.drinking) lines.push(`Drinking: ${p.drinking}`);
      if (p.children) lines.push(`Children: ${p.children}`);
      if (p.religion) lines.push(`Religion: ${p.religion}`);
      if (p.pets) lines.push(`Pets: ${p.pets}`);
      if (p.political_beliefs) lines.push(`Politics: ${p.political_beliefs}`);
      if (p.personality_type) lines.push(`Personality type: ${p.personality_type}`);
      if (p.favourite_music && (p.favourite_music as string[]).length) lines.push(`Music taste: ${(p.favourite_music as string[]).join(", ")}`);
      if (p.favourite_film && (p.favourite_film as string[]).length) lines.push(`Film preferences: ${(p.favourite_film as string[]).join(", ")}`);
      if (p.favourite_sport && (p.favourite_sport as string[]).length) lines.push(`Sports: ${(p.favourite_sport as string[]).join(", ")}`);
      if (p.favourite_hobbies && (p.favourite_hobbies as string[]).length) lines.push(`Hobbies: ${(p.favourite_hobbies as string[]).join(", ")}`);
      if (p.occupation) lines.push(`Career: ${p.occupation}`);
      if (p.education) lines.push(`Education: ${p.education}`);
      if (p.languages && (p.languages as string[]).length) lines.push(`Languages: ${(p.languages as string[]).join(", ")}`);
      if (p.ethnicity) lines.push(`Ethnicity: ${p.ethnicity}`);
      if (p.non_negotiables && (p.non_negotiables as string[]).length) lines.push(`Deal-breakers: ${(p.non_negotiables as string[]).join(", ")}`);
      
      // Add profile prompts for deeper personality insight
      if (prompts.length > 0) {
        lines.push("\nPersonality prompts (these reveal character and values):");
        for (const prompt of prompts) {
          lines.push(`  Q: ${prompt.prompt_text}\n  A: ${prompt.answer_text}`);
        }
      }
      
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
            content: `You are an advanced AI compatibility analyst for "LoveToDate", a premium dating platform. Your job is to perform DEEP, NUANCED analysis of two profiles to determine genuine long-term compatibility.

ANALYSIS DIMENSIONS (score each 0-100):
1. **Values Alignment** - Religion, politics, life philosophy, deal-breakers
2. **Lifestyle Compatibility** - Smoking, drinking, activity level, social habits
3. **Future Goals** - Relationship intentions, children, career ambitions
4. **Personality Chemistry** - Complementary traits, communication styles, personality types
5. **Shared Interests** - Hobbies, entertainment, passions they can enjoy together
6. **Emotional Intelligence** - Inferred from bio/prompts: empathy, self-awareness, maturity

CRITICAL FACTORS:
- Deal-breakers (non_negotiables) should heavily impact scores - if Person A lists something Person B IS, that's a major red flag
- Hypothetical Questions game data (if provided) is GOLD - it shows real decision-making alignment, not just stated preferences
- Look for complementary traits, not just matching ones (introvert + extrovert can work!)
- Consider cultural/lifestyle friction points

OUTPUT: Return an overall score (0-100), dimension scores, a fun summary (120 chars max), 2-3 specific things they have in common, and 2 personalized conversation starters based on their shared interests.`,
          },
          {
            role: "user",
            content: `Analyze compatibility between:

===== PERSON A (the viewer) =====
${formatProfile(selfRes.data, promptsA.data || [])}

===== PERSON B (${partnerRes.data.display_name}) =====
${formatProfile(partnerRes.data, promptsB.data || [])}
${gameMatchSummary}

Provide deep analysis considering all dimensions. Be honest but encouraging.`,
          },
        ],
        max_tokens: 800,
        tools: [
          {
            type: "function",
            function: {
              name: "return_compatibility",
              description: "Return comprehensive compatibility analysis",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", minimum: 0, maximum: 100, description: "Overall compatibility score 0-100" },
                  summary: { type: "string", description: "Brief fun summary, max 120 chars" },
                  dimensions: {
                    type: "object",
                    properties: {
                      values: { type: "number", minimum: 0, maximum: 100, description: "Values alignment score" },
                      lifestyle: { type: "number", minimum: 0, maximum: 100, description: "Lifestyle compatibility score" },
                      goals: { type: "number", minimum: 0, maximum: 100, description: "Future goals alignment score" },
                      personality: { type: "number", minimum: 0, maximum: 100, description: "Personality chemistry score" },
                      interests: { type: "number", minimum: 0, maximum: 100, description: "Shared interests score" },
                    },
                    required: ["values", "lifestyle", "goals", "personality", "interests"],
                  },
                  commonalities: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 specific things they have in common",
                  },
                  conversationStarters: {
                    type: "array",
                    items: { type: "string" },
                    description: "2 personalized conversation starters based on shared interests",
                  },
                  strengthsNote: { type: "string", description: "Brief note on strongest compatibility area (40 chars max)" },
                  watchOutNote: { type: "string", description: "Brief note on potential friction point or area to explore (50 chars max)" },
                },
                required: ["score", "summary", "dimensions", "commonalities", "conversationStarters"],
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
    
    // Default response
    let result: any = {
      score: 50,
      summary: "You two could be a great match! 💫",
      dimensions: { values: 50, lifestyle: 50, goals: 50, personality: 50, interests: 50 },
      commonalities: [],
      conversationStarters: [],
      hasGameData: !!gameMatchSummary,
      gameMatchPercent: gameMatchPercent || null,
    };

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (typeof parsed.score === "number") result.score = Math.max(0, Math.min(100, Math.round(parsed.score)));
        if (typeof parsed.summary === "string") result.summary = parsed.summary;
        if (parsed.dimensions) result.dimensions = parsed.dimensions;
        if (Array.isArray(parsed.commonalities)) result.commonalities = parsed.commonalities.slice(0, 3);
        if (Array.isArray(parsed.conversationStarters)) result.conversationStarters = parsed.conversationStarters.slice(0, 2);
        if (parsed.strengthsNote) result.strengthsNote = parsed.strengthsNote;
        if (parsed.watchOutNote) result.watchOutNote = parsed.watchOutNote;
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify(result), {
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
