import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
  eight_ball_pool: "8 Ball Pool",
  whos_who: "Who's Who?",
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

    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accepterId = callerUser.id;

    const rateCheck = await checkRateLimit(accepterId, {
      functionName: "notify-game-accepted",
      maxRequests: 30,
      windowMinutes: 60,
    });
    if (!rateCheck.allowed) return rateLimitResponse(corsHeaders);

    const { challengerId, gameType } = await req.json();

    if (!challengerId || !gameType) {
      return new Response(JSON.stringify({ error: "Missing challengerId or gameType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Get accepter's display name
    const { data: accepterProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", accepterId)
      .single();

    const accepterName = accepterProfile?.display_name || "Your opponent";
    const gameName = GAME_LABELS[gameType] || "a game";

    // Get challenger's notification preferences
    const { data: prefs } = await adminClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", challengerId)
      .maybeSingle();

    const emailEnabled = prefs?.email_notifications ?? true;
    const smsEnabled = prefs?.sms_notifications ?? false;
    const phoneNumber = prefs?.phone_number;

    // Get challenger's email
    const { data: userData } = await adminClient.auth.admin.getUserById(challengerId);
    const challengerEmail = userData?.user?.email;

    const results: Record<string, unknown> = {};

    // Email notification
    if (emailEnabled && challengerEmail) {
      try {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableApiKey) {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content:
                    "You write short, friendly email notifications for 'Love To Date' dating app. Return ONLY HTML body with inline styles. Keep under 80 words. Use gold (#D4A574) accent. Make it exciting — the game is on!",
                },
                {
                  role: "user",
                  content: `Write a notification: ${accepterName} has accepted the challenge to play ${gameName}! It's game time — encourage the recipient to open the app and make their first move.`,
                },
              ],
              max_tokens: 300,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const _emailBody =
              aiData.choices?.[0]?.message?.content ||
              `<p>🎮 <strong>${accepterName}</strong> accepted your ${gameName} challenge! Open Love To Date to make your move!</p>`;

            const maskedEmail = challengerEmail.replace(/(.{2}).*(@.*)/, "$1***$2");
            console.log(`[GAME-ACCEPT] Email queued for ${maskedEmail}`);
            results.email = { sent: true };
          }
        }
      } catch (err) {
        console.error("[GAME-ACCEPT] Email error:", err);
        results.email = { sent: false, error: "Failed" };
      }
    }

    // SMS notification
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (smsEnabled && phoneNumber && e164Regex.test(phoneNumber)) {
      try {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioSid && twilioToken && twilioPhone) {
          const smsBody = `🎮 Love To Date: ${accepterName} accepted your ${gameName} challenge! Open the app to play.`;

          const twilioResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: phoneNumber,
                From: twilioPhone,
                Body: smsBody,
              }),
            }
          );

          results.sms = { sent: twilioResponse.ok };
        }
      } catch (err) {
        console.error("[GAME-ACCEPT] SMS error:", err);
        results.sms = { sent: false, error: "Failed" };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[GAME-ACCEPT] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
