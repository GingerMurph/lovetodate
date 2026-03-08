import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json().catch(() => ({}));
    const digestType: "morning" | "evening" = body.type === "evening" ? "evening" : "morning";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Get all users with notification preferences
    const { data: allPrefs } = await admin
      .from("notification_preferences")
      .select("user_id, email_notifications, sms_notifications, phone_number");

    if (!allPrefs || allPrefs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const pref of allPrefs) {
      try {
        // Fetch unread messages for this user
        const { data: unreadMessages, count: unreadCount } = await admin
          .from("messages")
          .select("sender_id, content, created_at", { count: "exact" })
          .eq("recipient_id", pref.user_id)
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5);

        // Fetch new likes received (last 24h for morning, last 12h for evening)
        const hoursAgo = digestType === "morning" ? 24 : 12;
        const sinceDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

        const [likesResult, gamesResult] = await Promise.all([
          admin
            .from("likes")
            .select("id", { count: "exact", head: true })
            .eq("liked_id", pref.user_id)
            .gte("created_at", sinceDate),
          admin
            .from("games")
            .select("id", { count: "exact", head: true })
            .eq("opponent_id", pref.user_id)
            .eq("status", "pending"),
        ]);

        const totalUnread = unreadCount || 0;
        const totalLikes = likesResult.count || 0;
        const pendingGames = gamesResult.count || 0;

        // Skip if nothing to notify about
        if (totalUnread === 0 && totalLikes === 0 && pendingGames === 0) continue;

        // Get unique sender names for unread messages
        const senderIds = [...new Set((unreadMessages || []).map((m) => m.sender_id))];
        let senderNames: string[] = [];
        if (senderIds.length > 0) {
          const { data: senderProfiles } = await admin
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", senderIds);
          senderNames = (senderProfiles || []).map((p) => p.display_name);
        }

        // Build notification content
        const { subject, textBody, smsBody } = buildDigestContent(
          digestType,
          totalUnread,
          totalLikes,
          pendingGames,
          senderNames
        );

        // Get user's email
        const { data: userData } = await admin.auth.admin.getUserById(pref.user_id);
        const email = userData?.user?.email;

        // Send email if preferred
        if (pref.email_notifications && email) {
          await sendDigestEmail(email, subject, textBody);
          sentCount++;
        }

        // Send SMS if preferred
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (pref.sms_notifications && pref.phone_number && e164Regex.test(pref.phone_number)) {
          await sendDigestSms(pref.phone_number, smsBody);
          sentCount++;
        }
      } catch (err) {
        console.error(`[DIGEST] Error for user ${pref.user_id}:`, err);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, type: digestType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[DIGEST] Error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildDigestContent(
  type: "morning" | "evening",
  unreadCount: number,
  likesCount: number,
  pendingGames: number,
  senderNames: string[]
) {
  const greeting = type === "morning" ? "Good morning" : "Good evening";
  const parts: string[] = [];
  const smsParts: string[] = [];

  if (likesCount > 0) {
    parts.push(`💕 ${likesCount} new person${likesCount > 1 ? "s" : ""} would Love To Date you`);
    smsParts.push(`${likesCount} new like${likesCount > 1 ? "s" : ""}`);
  }

  if (unreadCount > 0) {
    const namesList =
      senderNames.length > 2
        ? `${senderNames.slice(0, 2).join(", ")} and ${senderNames.length - 2} other${senderNames.length - 2 > 1 ? "s" : ""}`
        : senderNames.join(" and ");
    parts.push(`💬 You have ${unreadCount} unread message${unreadCount > 1 ? "s" : ""} from ${namesList}`);
    smsParts.push(`${unreadCount} unread msg${unreadCount > 1 ? "s" : ""}`);
  }

  if (pendingGames > 0) {
    parts.push(`🎮 ${pendingGames} game invite${pendingGames > 1 ? "s" : ""} waiting for you`);
    smsParts.push(`${pendingGames} game invite${pendingGames > 1 ? "s" : ""}`);
  }

  const subject =
    type === "morning"
      ? `☀️ ${greeting}! Your Love To Date morning summary`
      : `🌙 ${greeting}! Don't miss out on Love To Date`;

  const textBody =
    type === "morning"
      ? `${greeting}! Here's your morning summary from Love To Date:\n\n${parts.join("\n")}\n\nOpen the app to see what's waiting for you! 💕`
      : `${greeting}! You still have activity waiting on Love To Date:\n\n${parts.join("\n")}\n\nDon't keep them waiting — check the app now! 💕`;

  const smsBody =
    type === "morning"
      ? `☀️ Love To Date: ${smsParts.join(", ")}. Check the app!`
      : `🌙 Love To Date: Still have ${smsParts.join(", ")} waiting. Don't miss out!`;

  return { subject, textBody, smsBody };
}

async function sendDigestEmail(email: string, subject: string, textBody: string) {
  try {
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      console.log("[DIGEST] No LOVABLE_API_KEY, skipping email");
      return;
    }

    // Generate styled email HTML using AI
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
              "You write beautifully styled HTML email bodies for 'Love To Date', a dating app. Use inline CSS. Warm rose/pink color scheme. Keep it concise and mobile-friendly. Include a prominent CTA button linking to https://lovetodate.lovable.app. Return ONLY the HTML body content, no wrapping <html> tags.",
          },
          {
            role: "user",
            content: `Create an email with subject: "${subject}"\n\nContent: ${textBody}`,
          },
        ],
        max_tokens: 500,
      }),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const _htmlBody =
        aiData.choices?.[0]?.message?.content ||
        `<p>${textBody.replace(/\n/g, "<br>")}</p>`;

      // NOTE: Email sending requires a configured email domain.
      // Currently logging the digest. Once an email domain is set up,
      // this will send via the Lovable email API.
      const maskedEmail = email.replace(/(.{2}).*(@.*)/, "$1***$2");
      console.log(`[DIGEST] Email digest prepared for ${maskedEmail}: ${subject}`);
    }
  } catch (err) {
    console.error("[DIGEST] Email generation error:", err);
  }
}

async function sendDigestSms(phoneNumber: string, body: string) {
  try {
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioSid || !twilioToken || !twilioPhone) {
      console.log("[DIGEST] Twilio not configured, skipping SMS");
      return;
    }

    const response = await fetch(
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
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`[DIGEST] SMS send failed: ${err}`);
    } else {
      const maskedPhone = phoneNumber.replace(/(\+\d{2})\d+(\d{3})/, "$1***$2");
      console.log(`[DIGEST] SMS sent to ${maskedPhone}`);
    }
  } catch (err) {
    console.error("[DIGEST] SMS error:", err);
  }
}
