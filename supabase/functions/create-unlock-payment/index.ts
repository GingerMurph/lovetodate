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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error("targetUserId is required");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof targetUserId !== "string" || !uuidRegex.test(targetUserId)) {
      throw new Error("Invalid targetUserId format");
    }

    // Prevent self-unlocking
    if (targetUserId === user.id) {
      throw new Error("Cannot unlock your own profile");
    }

    // Check if already unlocked
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: existing } = await supabaseAdmin
      .from("unlocked_connections")
      .select("id")
      .or(`and(unlocker_id.eq.${user.id},target_id.eq.${targetUserId}),and(unlocker_id.eq.${targetUserId},target_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      throw new Error("Connection already unlocked");
    }

    // Verify target profile exists
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!targetProfile) {
      throw new Error("Target profile not found");
    }

    // Validate origin against allowed list to prevent open redirect
    const ALLOWED_ORIGINS = [
      "https://id-preview--9fe98a5a-3a19-4985-a69b-54fbadb91a5f.lovable.app",
      "http://localhost:8080",
    ];
    const origin = req.headers.get("origin");
    const baseUrl = (origin && ALLOWED_ORIGINS.includes(origin))
      ? origin
      : ALLOWED_ORIGINS[0];

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: "price_1T0UATQLBBTimpxJNxemMmVX",
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}&target=${targetUserId}`,
      cancel_url: `${baseUrl}/profile/${targetUserId}`,
      metadata: {
        unlocker_id: user.id,
        target_id: targetUserId,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-unlock-payment error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
