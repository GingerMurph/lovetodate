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

    // Validate UUID format to prevent PostgREST filter injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (targetUserId.length > 36 || !uuidRegex.test(targetUserId)) {
      return new Response(JSON.stringify({ error: "Invalid targetUserId format" }), {
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

    // Atomic claim via SECURITY DEFINER RPC (uses pg_advisory_xact_lock to
    // prevent race conditions where concurrent requests could each pass the
    // count=0 check and unlock multiple free connections).
    const { data: result, error: rpcError } = await adminClient.rpc(
      "claim_free_connection_atomic",
      { _unlocker: user.id, _target: targetUserId },
    );

    if (rpcError) {
      console.error("claim_free_connection_atomic error:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to create connection" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result === "no_mutual_like") {
      return new Response(JSON.stringify({ error: "Mutual like required to claim free connection" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (result === "already_connected") {
      return new Response(JSON.stringify({ error: "Already connected" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (result === "already_used") {
      return new Response(JSON.stringify({ error: "Free connection already used. Please subscribe to unlock more." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (result !== "ok") {
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
