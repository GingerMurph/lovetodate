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

    const body = await req.json();
    const { userId } = body;
    const viewerLat: number | null = typeof body.lat === "number" ? body.lat : null;
    const viewerLng: number | null = typeof body.lng === "number" ? body.lng : null;

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

    const [profileRes, likeRes, likeBackRes, connForward, connReverse, locationRes, promptsRes, subCacheRes, myConnectionsCount, privateDataRes] = await Promise.all([
      adminClient.from("profiles")
        .select("user_id, display_name, avatar_url, photo_urls, bio, gender, body_build, height_cm, weight_kg, location_city, location_country, nationality, occupation, education, smoking, drinking, children, interests, relationship_goal, looking_for, is_paused, religion, ethnicity, languages, pets, political_beliefs, favourite_music, favourite_film, favourite_sport, favourite_hobbies, personality_type, is_verified, non_negotiables, diet")
        .eq("user_id", userId)
        .maybeSingle(),
      adminClient.from("likes").select("id").eq("liker_id", user.id).eq("liked_id", userId).maybeSingle(),
      adminClient.from("likes").select("id").eq("liker_id", userId).eq("liked_id", user.id).maybeSingle(),
      adminClient.from("unlocked_connections").select("id")
        .eq("unlocker_id", user.id).eq("target_id", userId).maybeSingle(),
      adminClient.from("unlocked_connections").select("id")
        .eq("unlocker_id", userId).eq("target_id", user.id).maybeSingle(),
      adminClient.from("user_locations").select("latitude, longitude").eq("user_id", userId).maybeSingle(),
      adminClient.from("profile_prompts").select("prompt_text, answer_text, display_order").eq("user_id", userId).order("display_order"),
      adminClient.from("subscriber_cache").select("is_subscribed").eq("user_id", userId).maybeSingle(),
      adminClient.from("unlocked_connections").select("id", { count: "exact", head: true }).eq("unlocker_id", user.id),
      adminClient.from("profile_private_data").select("date_of_birth").eq("user_id", userId).maybeSingle(),
    ]);
    const connectionRes = { data: connForward.data || connReverse.data };

    if (!profileRes.data) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { avatar_url, photo_urls, ...rest } = profileRes.data;
    const date_of_birth = privateDataRes.data?.date_of_birth || null;
    const latitude = locationRes.data?.latitude ?? null;
    const longitude = locationRes.data?.longitude ?? null;

    const signUrl = async (rawPath: string | null): Promise<string | null> => {
      if (!rawPath) return null;
      const path = rawPath.includes("/object/public/")
        ? rawPath.split("/object/public/profile-photos/")[1]
        : rawPath;
      const { data: signedData } = await adminClient.storage
        .from("profile-photos")
        .createSignedUrl(path, 3600);
      return signedData?.signedUrl || null;
    };

    const signedAvatarUrl = await signUrl(avatar_url);
    const extraPhotos: string[] = Array.isArray(photo_urls) ? photo_urls : [];
    const signedPhotoUrls = await Promise.all(extraPhotos.map(signUrl));

    const isOwnProfile = user.id === userId;
    const isLiked = !!likeRes.data;
    const isLikedBack = !!likeBackRes.data;
    const isUnlocked = !!connectionRes.data;
    const isSubscribed = subCacheRes.data?.is_subscribed ?? false;

    const age = date_of_birth
      ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / 31557600000)
      : null;

    function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3959;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    let distanceMiles: number | null = null;
    if (!isOwnProfile && viewerLat !== null && viewerLng !== null && latitude !== null && longitude !== null) {
      distanceMiles = Math.round(haversineDistance(viewerLat, viewerLng, latitude, longitude));
    }

    const prompts = (promptsRes.data || []).map(({ prompt_text, answer_text }: any) => ({ prompt_text, answer_text }));
    const profile: Record<string, unknown> = { ...rest, avatar_url: signedAvatarUrl, photo_urls: signedPhotoUrls.filter(Boolean), age, distance_miles: distanceMiles, prompts, is_subscribed: isSubscribed };

    const freeConnectionAvailable = (myConnectionsCount.count ?? 0) === 0;

    return new Response(JSON.stringify({
      profile,
      isLiked,
      isLikedBack,
      isUnlocked,
      isOwnProfile,
      freeConnectionAvailable,
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
