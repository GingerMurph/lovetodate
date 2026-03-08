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
    price_id: "price_1T8hYvQLBBTimpxJc5LhrWmx",
    product_id: "prod_U6vPVtTXA6xNdK",
    label: "1 Week",
    price: 9.99,
    perWeek: 9.99,
  },
  month: {
    price_id: "price_1T8hYwQLBBTimpxJICkGrYR2",
    product_id: "prod_U6vPkYeEAz7XXI",
    label: "1 Month",
    price: 18.99,
    perWeek: 18.99 / 4.33,
  },
  sixMonths: {
    price_id: "price_1T8hYwQLBBTimpxJQ5Izugkq",
    product_id: "prod_U6vPoSYCH4W4V6",
    label: "6 Months",
    price: 56.99,
    perWeek: 56.99 / 26,
  },
  year: {
    price_id: "price_1T8hYxQLBBTimpxJ7ifj1kHJ",
    product_id: "prod_U6vPfJHOi8KJdT",
    label: "12 Months",
    price: 79.99,
    perWeek: 79.99 / 52,
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
