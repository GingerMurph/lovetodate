import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "matches_last_viewed";

export function useUnviewedMatches() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) return;

    const lastViewed = localStorage.getItem(`${STORAGE_KEY}_${user.id}`) || "1970-01-01T00:00:00Z";

    const { data: sent } = await supabase
      .from("likes")
      .select("liked_id")
      .eq("liker_id", user.id);

    if (!sent || sent.length === 0) { setCount(0); return; }

    const sentIds = sent.map((l) => l.liked_id);

    const { data: mutual, error } = await supabase
      .from("likes")
      .select("id")
      .eq("liked_id", user.id)
      .in("liker_id", sentIds)
      .gt("created_at", lastViewed);

    if (!error && mutual) {
      setCount(mutual.length);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();

    if (!user) return;

    const channel = supabase
      .channel("unviewed-matches")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "likes", filter: `liked_id=eq.${user.id}` },
        () => fetchCount()
      )
      .subscribe();

    // Listen for storage changes from other hook instances (same tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY}_${user.id}`) {
        setCount(0);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, fetchCount]);

  const markViewed = useCallback(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}_${user.id}`;
    localStorage.setItem(key, new Date().toISOString());
    setCount(0);
    // Dispatch storage event for other instances in the same tab
    window.dispatchEvent(new StorageEvent("storage", { key }));
  }, [user]);

  return { unviewedMatchCount: count, markViewed };
}
