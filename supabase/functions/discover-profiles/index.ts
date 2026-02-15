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

    // Verify the user
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

    // Use service role to bypass RLS and fetch all profiles except the user's own
    // Only return basic discovery fields — detailed info requires like/unlock
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profiles, error } = await adminClient
      .from("profiles")
      .select(
        "user_id, display_name, avatar_url, gender, body_build, height_cm, " +
        "location_city, nationality, date_of_birth"
      )
      .neq("user_id", user.id)
      .neq("is_paused", true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate age from date_of_birth, then strip the raw field
    // Generate signed URLs for avatars since bucket is private
    const sanitized = await Promise.all(
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
          age: date_of_birth
            ? Math.floor((Date.now() - new Date(date_of_birth).getTime()) / 31557600000)
            : null,
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
