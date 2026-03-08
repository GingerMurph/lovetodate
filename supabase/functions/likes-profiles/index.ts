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

    // Get likes sent by and received by the user
    const [sentRes, receivedRes] = await Promise.all([
      adminClient.from("likes").select("liked_id").eq("liker_id", user.id),
      adminClient.from("likes").select("liker_id").eq("liked_id", user.id),
    ]);

    const sentIds = sentRes.data?.map((l) => l.liked_id) || [];
    const receivedIds = receivedRes.data?.map((l) => l.liker_id) || [];

    const allIds = [...new Set([...sentIds, ...receivedIds])];

    if (allIds.length === 0) {
      return new Response(JSON.stringify({ sent: [], received: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await adminClient
      .from("profiles")
      .select("user_id, display_name, avatar_url, date_of_birth, location_city, nationality, is_verified")
      .in("user_id", allIds);

    // Fetch subscription status
    const { data: subCache } = await adminClient
      .from("subscriber_cache")
      .select("user_id, is_subscribed")
      .in("user_id", allIds);
    const subMap = new Map((subCache || []).map((s) => [s.user_id, s.is_subscribed]));

    // Sign avatar URLs and compute age
    const signedProfiles = await Promise.all(
      (profiles || []).map(async ({ date_of_birth, avatar_url, ...rest }) => {
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
        return {
          ...rest,
          avatar_url: signedAvatarUrl,
          is_subscribed: subMap.get(rest.user_id) || false,
          age: date_of_birth
            ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / 31557600000)
            : null,
        };
      })
    );

    const profileMap = new Map(signedProfiles.map((p) => [p.user_id, p]));

    const sent = sentIds.map((id) => profileMap.get(id)).filter(Boolean);
    const received = receivedIds.map((id) => profileMap.get(id)).filter(Boolean);

    return new Response(JSON.stringify({ sent, received }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("likes-profiles error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
