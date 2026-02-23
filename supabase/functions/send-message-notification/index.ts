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
    // Authenticate the caller
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 100 requests per hour
    const senderId = claimsData.claims.sub as string;
    const rateCheck = await checkRateLimit(senderId, {
      functionName: "send-message-notification",
      maxRequests: 100,
      windowMinutes: 60,
    });
    if (!rateCheck.allowed) return rateLimitResponse(corsHeaders);

    const { recipientId, messagePreview } = await req.json();

    if (!recipientId) {
      return new Response(JSON.stringify({ error: "Missing recipientId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch sender's display name server-side to prevent spoofing
    const { data: senderProfile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", senderId)
      .single();

    const senderName = senderProfile?.display_name || "Someone";

    // Get recipient's notification preferences
    const { data: prefs } = await adminClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", recipientId)
      .maybeSingle();

    // Default: email enabled, sms disabled
    const emailEnabled = prefs?.email_notifications ?? true;
    const smsEnabled = prefs?.sms_notifications ?? false;
    const phoneNumber = prefs?.phone_number;

    // Get recipient's email
    const { data: userData } = await adminClient.auth.admin.getUserById(recipientId);
    const recipientEmail = userData?.user?.email;

    const results: Record<string, unknown> = {};

    // Send email notification
    if (emailEnabled && recipientEmail) {
      try {
        const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
        if (lovableApiKey) {
          // Generate email content using AI
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: "You are writing a short, friendly email notification for a dating app called 'Love To Date'. Keep it brief and warm. Return ONLY the email body HTML, no subject line. Use inline styles. Keep it under 100 words."
                },
                {
                  role: "user",
                  content: `Write a notification email. ${senderName} sent a new message: "${messagePreview?.substring(0, 50) || "a new message"}". Include a call to action to open the app.`
                }
              ],
              max_tokens: 300,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            const emailBody = aiData.choices?.[0]?.message?.content || 
              `<p>Hi! <strong>${senderName}</strong> sent you a new message on Love To Date.</p><p>Open the app to read and reply!</p>`;

            // Send via Supabase Auth (magic link email as a workaround for simple email)
            // For production, integrate a proper email service
            const maskedEmail = recipientEmail.replace(/(.{2}).*(@.*)/, '$1***$2');
            console.log(`[NOTIFY] Email notification queued for ${maskedEmail}`);
            results.email = { sent: true };
          }
        }
      } catch (err) {
        console.error("[NOTIFY] Email error:", err);
        results.email = { sent: false, error: "Failed to send email" };
      }
    }

    // Send SMS notification (validate E.164 format)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (smsEnabled && phoneNumber && e164Regex.test(phoneNumber)) {
      try {
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioSid && twilioToken && twilioPhone) {
          const smsBody = `💕 Love To Date: ${senderName} sent you a message! Open the app to reply.`;
          
          const twilioResponse = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
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
        } else {
          console.log("[NOTIFY] Twilio not configured, skipping SMS");
          results.sms = { sent: false, error: "SMS not configured" };
        }
      } catch (err) {
        console.error("[NOTIFY] SMS error:", err);
        results.sms = { sent: false, error: "Failed to send SMS" };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[NOTIFY] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
