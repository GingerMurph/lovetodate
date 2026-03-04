import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POSES = [
  { instruction: "Give a thumbs up 👍", key: "thumbs_up" },
  { instruction: "Make a peace sign ✌️", key: "peace_sign" },
  { instruction: "Wave at the camera 👋", key: "wave" },
  { instruction: "Point to your nose 👆", key: "point_nose" },
  { instruction: "Show three fingers 🤟", key: "three_fingers" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Invalidate any existing unused challenges for this user
    await adminClient
      .from("verification_challenges")
      .update({ used: true })
      .eq("user_id", user.id)
      .eq("used", false);

    // Pick a random pose
    const pose = POSES[Math.floor(Math.random() * POSES.length)];

    // Generate a cryptographically random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const challengeToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Challenge expires in 3 minutes
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    const { error: insertErr } = await adminClient
      .from("verification_challenges")
      .insert({
        user_id: user.id,
        pose: pose.key,
        token: challengeToken,
        expires_at: expiresAt,
      });

    if (insertErr) {
      console.error("Challenge insert error:", insertErr);
      return new Response(JSON.stringify({ error: "Failed to create challenge" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        challenge_token: challengeToken,
        pose_key: pose.key,
        pose_instruction: pose.instruction,
        expires_at: expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-verification-challenge error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
