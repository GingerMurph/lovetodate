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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return new Response(JSON.stringify({ error: "Invalid userId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the requesting user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch the profile, like status, and connection status in parallel
    const [profileRes, likeRes, likeBackRes, connForward, connReverse] = await Promise.all([
      adminClient.from("profiles")
        .select("user_id, display_name, avatar_url, bio, gender, body_build, height_cm, weight_kg, location_city, location_country, nationality, occupation, education, smoking, drinking, children, interests, relationship_goal, looking_for, date_of_birth")
        .eq("user_id", userId)
        .maybeSingle(),
      adminClient.from("likes").select("id").eq("liker_id", user.id).eq("liked_id", userId).maybeSingle(),
      adminClient.from("likes").select("id").eq("liker_id", userId).eq("liked_id", user.id).maybeSingle(),
      adminClient.from("unlocked_connections").select("id")
        .eq("unlocker_id", user.id).eq("target_id", userId).maybeSingle(),
      adminClient.from("unlocked_connections").select("id")
        .eq("unlocker_id", userId).eq("target_id", user.id).maybeSingle(),
    ]);
    const connectionRes = { data: connForward.data || connReverse.data };

    if (!profileRes.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date_of_birth, avatar_url, ...rest } = profileRes.data;

    // Sign avatar URL
    let signedAvatarUrl: string | null = null;
    if (avatar_url) {
      const path = avatar_url.includes("/object/public/")
        ? avatar_url.split("/object/public/profile-photos/")[1]
        : avatar_url;
      const { data: signedData } = await adminClient.storage
        .from("profile-photos")
        .createSignedUrl(path, 3600);
      signedAvatarUrl = signedData?.signedUrl || null;
    }

    const isOwnProfile = user.id === userId;
    const isLiked = !!likeRes.data;
    const isLikedBack = !!likeBackRes.data;
    const isUnlocked = !!connectionRes.data;

    const age = date_of_birth
      ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / 31557600000)
      : null;

    // Full profile data for all authenticated users
    const profile: Record<string, unknown> = { ...rest, avatar_url: signedAvatarUrl, age };

    return new Response(JSON.stringify({
      profile,
      isLiked,
      isLikedBack,
      isUnlocked,
      isOwnProfile,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("view-profile error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
