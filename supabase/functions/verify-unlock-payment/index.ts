import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { sessionId } = await req.json();
    if (!sessionId || typeof sessionId !== "string") throw new Error("sessionId is required");

    // Validate sessionId format (Stripe session IDs start with cs_)
    if (!sessionId.startsWith("cs_") || sessionId.length > 255) {
      throw new Error("Invalid sessionId format");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    const unlockerId = session.metadata?.unlocker_id;
    const targetId = session.metadata?.target_id;

    if (!unlockerId || !targetId) throw new Error("Invalid session metadata");
    if (unlockerId !== user.id) throw new Error("Unauthorized");

    // Upsert to handle race conditions idempotently
    const { error: upsertError } = await supabaseAdmin
      .from("unlocked_connections")
      .upsert(
        { unlocker_id: unlockerId, target_id: targetId },
        { onConflict: "unlocker_id,target_id", ignoreDuplicates: true }
      );
    if (upsertError) throw new Error("Failed to unlock connection");

    return new Response(JSON.stringify({ success: true, targetId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("verify-unlock-payment error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
