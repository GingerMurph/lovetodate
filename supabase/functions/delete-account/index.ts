import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

    // Rate limit: 3 requests per day
    const rateCheck = await checkRateLimit(user.id, {
      functionName: "delete-account",
      maxRequests: 3,
      windowMinutes: 1440,
    });
    if (!rateCheck.allowed) return rateLimitResponse(corsHeaders);

    // Validate user.id UUID format (defense in depth)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user.id)) {
      return new Response(JSON.stringify({ error: "Invalid user ID format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete profile photos from storage
    const { data: files } = await adminClient.storage
      .from("profile-photos")
      .list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await adminClient.storage.from("profile-photos").remove(paths);
    }

    // Delete likes (both directions) - use separate deletes to avoid string interpolation
    const safeUserId = user.id; // UUID-validated above
    await Promise.all([
      adminClient.from("likes").delete().eq("liker_id", safeUserId),
      adminClient.from("likes").delete().eq("liked_id", safeUserId),
    ]);

    // Delete unlocked connections (both directions)
    await Promise.all([
      adminClient.from("unlocked_connections").delete().eq("unlocker_id", safeUserId),
      adminClient.from("unlocked_connections").delete().eq("target_id", safeUserId),
    ]);

    // Delete private data and profile
    await adminClient.from("profile_private_data").delete().eq("user_id", user.id);
    await adminClient.from("profiles").delete().eq("user_id", user.id);

    // Delete auth user (this is permanent)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
