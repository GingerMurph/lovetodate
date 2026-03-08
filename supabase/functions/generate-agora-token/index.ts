import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { RtcTokenBuilder, RtcRole } from "npm:agora-token@2.0.3";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get("AGORA_APP_ID");
    const appCertificate = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!appId || !appCertificate) throw new Error("Agora credentials not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    const { partnerId } = await req.json();
    if (!partnerId) throw new Error("partnerId is required");

    // Verify mutual match (both liked each other)
    const [likeA, likeB] = await Promise.all([
      supabase.from("likes").select("id").eq("liker_id", userId).eq("liked_id", partnerId).maybeSingle(),
      supabase.from("likes").select("id").eq("liker_id", partnerId).eq("liked_id", userId).maybeSingle(),
    ]);
    if (!likeA.data || !likeB.data) {
      return new Response(JSON.stringify({ error: "You must be mutually matched to video call" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Verify caller is subscribed
    const { data: subCache } = await supabase
      .from("subscriber_cache")
      .select("is_subscribed")
      .eq("user_id", userId)
      .maybeSingle();
    if (!subCache?.is_subscribed) {
      return new Response(JSON.stringify({ error: "Subscription required for video calls" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Generate channel name from sorted user IDs (deterministic)
    const channelName = [userId, partnerId].sort().join("-").substring(0, 64);

    // Generate RTC token (valid for 1 hour)
    const uid = 0; // Use 0 for string UID mode
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600;
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      role,
      expireTime,
      privilegeExpireTime
    );

    return new Response(JSON.stringify({
      token: rtcToken,
      channelName,
      appId,
      uid,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("generate-agora-token error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
