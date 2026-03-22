import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Listens for realtime "like" events where the current user is liked,
 * plays the cheer sound and shows a toast notification.
 */
export function useLikeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    // Pre-load the cheer sound
    const audio = new Audio("/cheer.mp3");
    audio.preload = "auto";
    audioRef.current = audio;

    const channel = supabase
      .channel("like-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `liked_id=eq.${user.id}`,
        },
        async (payload) => {
          const like = payload.new as any;

          // Play cheer sound
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              await audioRef.current.play();
            }
          } catch (e) {
            console.warn("Could not play like notification sound:", e);
          }

          // Fetch liker's name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", like.liker_id)
            .single();

          const name = profile?.display_name || "Someone";

          toast({
            title: "❤️ New Like!",
            description: `${name} would love to date you!`,
            action: (
              <button
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-gold/90 transition-colors"
                onClick={() => navigate("/likes")}
              >
                View
              </button>
            ),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, navigate]);
}
