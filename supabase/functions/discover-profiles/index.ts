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

    // Parse optional viewer coordinates for server-side distance calculation
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

    // Verify the user with explicit token
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

    // Use service role to bypass RLS and fetch all profiles except the user's own
    // Latitude/longitude are fetched only for server-side distance calculation — never returned to client
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select(
        "user_id, display_name, avatar_url, photo_urls, gender, body_build, height_cm, " +
        "location_city, nationality, date_of_birth, religion, smoking, drinking, personality_type, latitude, longitude, max_distance_miles, relationship_goal"
      )
      .neq("user_id", user.id)
      .neq("is_paused", true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side haversine distance (miles) — raw coords are never exposed
    function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const R = 3959;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Calculate age from date_of_birth and distance server-side, then strip raw coords and dob
    // Generate signed URLs for avatars since bucket is private
    const sanitized = await Promise.all(
      (profiles || []).map(async ({ date_of_birth, avatar_url, photo_urls, latitude, longitude, max_distance_miles, relationship_goal, ...rest }) => {
        // Sign all photo URLs
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

        // Compute distance server-side; never expose raw coordinates
        let distanceMiles: number | null = null;
        if (viewerLat !== null && viewerLng !== null && latitude !== null && longitude !== null) {
          distanceMiles = Math.round(haversineDistance(viewerLat, viewerLng, latitude, longitude));
        }

        // "I'm Free Tonight" overrides the distance restriction
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
