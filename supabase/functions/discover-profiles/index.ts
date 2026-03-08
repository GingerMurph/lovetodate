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

    let viewerLat: number | null = null;
    let viewerLng: number | null = null;
    try {
      const body = await req.json().catch(() => ({}));
      if (typeof body.lat === "number" && typeof body.lng === "number") {
        viewerLat = body.lat;
        viewerLng = body.lng;
      }
    } catch { /* no body */ }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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
    const [{ data: profiles, error }, { data: locations }, { data: allPrompts }, { data: subscriberCache }, { data: privateData }] = await Promise.all([
      adminClient
        .from("profiles")
        .select(
          "user_id, display_name, avatar_url, photo_urls, gender, body_build, height_cm, " +
          "location_city, nationality, religion, smoking, drinking, personality_type, max_distance_miles, relationship_goal, is_verified, non_negotiables"
        )
        .neq("user_id", user.id)
        .neq("is_paused", true),
      adminClient.from("user_locations").select("user_id, latitude, longitude"),
      adminClient.from("profile_prompts").select("user_id, prompt_text, answer_text, display_order").order("display_order"),
      adminClient.from("subscriber_cache").select("user_id, is_subscribed").eq("is_subscribed", true),
      adminClient.from("profile_private_data").select("user_id, date_of_birth"),
    ]);

    const locationMap = new Map((locations || []).map(l => [l.user_id, l]));
    const subscriberSet = new Set((subscriberCache || []).map(s => s.user_id));
    const dobMap = new Map((privateData || []).map(p => [p.user_id, p.date_of_birth]));
    const promptsMap = new Map<string, { prompt_text: string; answer_text: string }[]>();
    for (const p of (allPrompts || [])) {
      const arr = promptsMap.get(p.user_id) || [];
      if (arr.length < 2) arr.push({ prompt_text: p.prompt_text, answer_text: p.answer_text });
      promptsMap.set(p.user_id, arr);
    }

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3959;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const sanitized = await Promise.all(
      (profiles || []).map(async ({ date_of_birth, avatar_url, photo_urls, max_distance_miles, relationship_goal, non_negotiables, ...rest }) => {
        const loc = locationMap.get(rest.user_id);
        const latitude = loc?.latitude ?? null;
        const longitude = loc?.longitude ?? null;
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

        let distanceMiles: number | null = null;
        if (viewerLat !== null && viewerLng !== null && latitude !== null && longitude !== null) {
          distanceMiles = Math.round(haversineDistance(viewerLat, viewerLng, latitude, longitude));
        }

        const isFreeTonightTarget = Array.isArray(relationship_goal) && relationship_goal.includes("free_tonight");
        const tooFar = !isFreeTonightTarget && max_distance_miles !== null && distanceMiles !== null && distanceMiles > max_distance_miles;

        return {
          ...rest,
          avatar_url: signedAvatarUrl,
          photo_urls: signedPhotoUrls.filter(Boolean),
          age: date_of_birth
            ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / 31557600000)
            : null,
          distance_miles: distanceMiles,
          max_distance_miles: max_distance_miles,
          too_far: tooFar,
          non_negotiables: Array.isArray(non_negotiables) ? non_negotiables : [],
          prompts: promptsMap.get(rest.user_id) || [],
          is_subscribed: subscriberSet.has(rest.user_id),
        };
      })
    );

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("discover-profiles error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
