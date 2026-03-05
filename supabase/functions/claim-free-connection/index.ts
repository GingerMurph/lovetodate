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
    const { targetUserId } = body;

    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "targetUserId is required" }), {
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

    // Prevent self-unlock
    if (user.id === targetUserId) {
      return new Response(JSON.stringify({ error: "Cannot unlock yourself" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check mutual like exists
    const [likeForward, likeBack] = await Promise.all([
      adminClient.from("likes").select("id").eq("liker_id", user.id).eq("liked_id", targetUserId).maybeSingle(),
      adminClient.from("likes").select("id").eq("liker_id", targetUserId).eq("liked_id", user.id).maybeSingle(),
    ]);

    if (!likeForward.data || !likeBack.data) {
      return new Response(JSON.stringify({ error: "Mutual like required to claim free connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already connected
    const { data: existingConn } = await adminClient
      .from("unlocked_connections")
      .select("id")
      .or(`and(unlocker_id.eq.${user.id},target_id.eq.${targetUserId}),and(unlocker_id.eq.${targetUserId},target_id.eq.${user.id})`)
      .maybeSingle();

    if (existingConn) {
      return new Response(JSON.stringify({ error: "Already connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check how many connections the user has already unlocked (as unlocker)
    const { count } = await adminClient
      .from("unlocked_connections")
      .select("id", { count: "exact", head: true })
      .eq("unlocker_id", user.id);

    if ((count ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "Free connection already used. Please subscribe to unlock more." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the free connection
    const { error: insertError } = await adminClient
      .from("unlocked_connections")
      .insert({ unlocker_id: user.id, target_id: targetUserId });

    if (insertError) {
      console.error("Failed to create free connection:", insertError);
      return new Response(JSON.stringify({ error: "Failed to create connection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("claim-free-connection error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
