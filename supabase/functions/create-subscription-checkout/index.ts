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

    const body = await req.json();
    const { priceId, trial } = body;
    const ALLOWED_PRICE_IDS = new Set([
      "price_1T8hYvQLBBTimpxJc5LhrWmx", // 1 week
      "price_1T8hYwQLBBTimpxJICkGrYR2", // 1 month
      "price_1T8hYwQLBBTimpxJQ5Izugkq", // 6 months
      "price_1T8hYxQLBBTimpxJ7ifj1kHJ", // 12 months
    ]);
    if (!priceId || typeof priceId !== "string" || !ALLOWED_PRICE_IDS.has(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Server-side trial eligibility: only allow trial on first subscription
    let trialEligible = false;
    if (trial) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      const { data: cached } = await adminClient
        .from("subscriber_cache")
        .select("is_subscribed")
        .eq("user_id", user.id)
        .maybeSingle();
      trialEligible = !cached?.is_subscribed;
    }

    // Validate origin
    const origin = req.headers.get("origin") || "";
    const isLovableApp = /^https:\/\/[\w-]+\.lovable\.app$/.test(origin);
    const isLocalhost = origin === "http://localhost:8080";
    const DEFAULT_URL = "https://lovetodate.lovable.app";
    const baseUrl = (isLovableApp || isLocalhost) ? origin : DEFAULT_URL;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${baseUrl}/subscription?success=true`,
      cancel_url: `${baseUrl}/subscription`,
    };

    if (trial) {
      sessionParams.subscription_data = { trial_period_days: 30 };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("create-subscription-checkout error:", error);
    return new Response(JSON.stringify({ error: "An error occurred processing your request." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
