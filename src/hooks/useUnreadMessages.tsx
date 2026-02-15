import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type UnreadContextType = {
  unreadCount: number;
  refreshUnread: () => void;
};

const UnreadContext = createContext<UnreadContextType>({ unreadCount: 0, refreshUnread: () => {} });

export const useUnreadMessages = () => useContext(UnreadContext);

export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // Realtime: listen for new messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if ((payload.new as any).recipient_id === user.id) {
            setUnreadCount((c) => c + 1);
            // Play sound if enabled
            playNotificationSound();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          if ((payload.new as any).recipient_id === user.id && (payload.new as any).is_read) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <UnreadContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

// Simple notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Silently fail if audio not available
  }
}
