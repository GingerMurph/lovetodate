import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, SUBSCRIPTION_TIERS } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Crown, Heart, Shield, Loader2, Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

const tiers = [
  {
    key: "week" as const,
    popular: false,
    savings: null,
  },
  {
    key: "month" as const,
    popular: false,
    savings: null,
  },
  {
    key: "sixMonths" as const,
    popular: true,
    savings: 49,
  },
  {
    key: "year" as const,
    popular: false,
    savings: 64,
  },
];

const Subscription = () => {
  const { user } = useAuth();
  const { subscribed, productId, subscriptionEnd, checkSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const isSuccess = searchParams.get("success") === "true";
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [managingPortal, setManagingPortal] = useState(false);

  // Refresh subscription on success
  if (isSuccess) {
    checkSubscription();
  }

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    if (!user) return;
    setLoadingTier(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
        body: { priceId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Failed to start checkout");
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } finally {
      setLoadingTier(null);
    }
  };

  const handleManage = async () => {
    setManagingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error || data?.error) {
        toast.error("Failed to open billing portal");
        return;
      }
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } finally {
      setManagingPortal(false);
    }
  };

  const currentTier = productId
    ? Object.values(SUBSCRIPTION_TIERS).find((t) => t.product_id === productId)
    : null;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="h-8 w-8 text-gold" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold">
              Love To <span className="text-gold">Date</span> Premium
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-3">
            No more paying blindly. Only pay when you find someone you'd <strong className="text-gold whitespace-nowrap">Love To Date</strong>.
          </p>
          <p className="text-sm text-muted-foreground">
            Affordable dating with fair, transparent pricing.
          </p>
        </div>

        {/* Launch offer */}
        {!subscribed && (
          <Card className="mb-8 border-green-500/30 bg-green-500/5 hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <Gift className="h-8 w-8 text-green-500 shrink-0" />
              <div className="flex-1">
                <h3 className="font-serif font-bold text-lg">🎉 Launch Special</h3>
                <p className="text-sm text-muted-foreground">
                  Your <strong>first month is completely free</strong> during our launch period! Start connecting with no commitment.
                </p>
              </div>
              <Button
                className="bg-green-500 hover:bg-green-600 text-white shrink-0"
                onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.month.price_id, "month_trial", true)}
                disabled={loadingTier === "month_trial"}
              >
                {loadingTier === "month_trial" ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4 mr-2" />
                )}
                Claim Free Month
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success message */}
        {isSuccess && (
          <Card className="mb-8 border-green-500/30 bg-green-500/10">
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <p className="font-medium">Welcome to Premium! Your subscription is now active.</p>
            </CardContent>
          </Card>
        )}

        {/* Current subscription */}
        {subscribed && currentTier && (
          <Card className="mb-8 border-gold/30 shadow-[0_0_20px_hsl(var(--rose)/0.1)]">
            <CardContent className="py-6 text-center space-y-3">
              <Badge className="gradient-gold text-primary-foreground px-4 py-1">
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Your Plan: {currentTier.label}
              </Badge>
              {subscriptionEnd && (
                <p className="text-sm text-muted-foreground">
                  Renews on {new Date(subscriptionEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
              <Button variant="outline" onClick={handleManage} disabled={managingPortal} className="border-gold/30">
                {managingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Heart, title: "Mutual Matches", desc: "Only connect with people who like you back" },
            { icon: Shield, title: "Verified Profiles", desc: "ID verification keeps the community genuine" },
            { icon: Sparkles, title: "Unlimited Messages", desc: "Chat freely with all your connections" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-4">
              <Icon className="h-8 w-8 text-gold mx-auto mb-2" />
              <h3 className="font-serif font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {tiers.map(({ key, popular, savings }) => {
            const tier = SUBSCRIPTION_TIERS[key];
            const isCurrentPlan = productId === tier.product_id;
            const perWeek = tier.perWeek.toFixed(2);

            return (
              <Card
                key={key}
                className={`relative overflow-hidden transition-all ${
                  popular
                    ? "border-gold shadow-[0_0_20px_hsl(var(--rose)/0.15)] scale-[1.02]"
                    : "border-border"
                } ${isCurrentPlan ? "ring-2 ring-gold" : ""}`}
              >
                {popular && (
                  <div className="absolute top-0 right-0 gradient-gold text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                {savings && (
                  <div className="absolute top-0 left-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-br-lg">
                    SAVE {savings}%
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 right-0 bg-gold/20 text-center py-1">
                    <span className="text-[10px] font-bold text-gold uppercase">Your Plan</span>
                  </div>
                )}
                <CardHeader className={`pb-2 ${isCurrentPlan || popular || savings ? "pt-8" : ""}`}>
                  <CardTitle className="font-serif text-lg text-center">{tier.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-3">
                  <div>
                    <span className="text-3xl font-bold">£{tier.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Just £{perWeek}/week
                  </p>
                  <Button
                    className={`w-full ${popular ? "gradient-gold text-primary-foreground" : ""}`}
                    variant={popular ? "default" : "outline"}
                    onClick={() => handleSubscribe(tier.price_id, key)}
                    disabled={loadingTier === key || isCurrentPlan}
                  >
                    {loadingTier === key ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : isCurrentPlan ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <Crown className="h-4 w-4 mr-2" />
                    )}
                    {isCurrentPlan ? "Current Plan" : "Subscribe"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Cancel anytime. No hidden fees. No more paying blindly.</p>
          <p className="mt-1 font-medium text-gold">Only pay when you find someone you'd Love To Date ❤️</p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Subscription;
