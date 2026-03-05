import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Map Stripe product IDs to tier names
export const SUBSCRIPTION_TIERS = {
  week: {
    price_id: "price_1T7a1lQLBBTimpxJ4o8hf5eW",
    product_id: "prod_U5lYdTBToUpTVG",
    label: "1 Week",
    price: 6.99,
    perWeek: 6.99,
  },
  month: {
    price_id: "price_1T7aLjQLBBTimpxJs3foHvjO",
    product_id: "prod_U5ltrSNCjiGiVI",
    label: "1 Month",
    price: 12.99,
    perWeek: 12.99 / 4.33,
  },
  sixMonths: {
    price_id: "price_1T7aLqQLBBTimpxJFfOQ99VI",
    product_id: "prod_U5ltiCll0KI92h",
    label: "6 Months",
    price: 39.99,
    perWeek: 39.99 / 26,
  },
  year: {
    price_id: "price_1T7aLtQLBBTimpxJ3va7XE2K",
    product_id: "prod_U5ltIyaGr82VjB",
    label: "12 Months",
    price: 54.99,
    perWeek: 54.99 / 52,
  },
} as const;

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (!error && data) {
        setSubscribed(data.subscribed || false);
        setProductId(data.product_id || null);
        setSubscriptionEnd(data.subscription_end || null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    // Check every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return (
    <SubscriptionContext.Provider value={{ subscribed, productId, subscriptionEnd, loading, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
}
