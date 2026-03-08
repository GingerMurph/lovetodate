import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
  eight_ball_pool: "8 Ball Pool",
  whos_who: "Who's Who?",
};

/**
 * Listens for realtime game invite/accept events and shows toast notifications.
 * Mount once in AppLayout.
 */
export function useGameNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("game-notifications")
      // New invite (I'm the opponent)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "games",
          filter: `opponent_id=eq.${user.id}`,
        },
        async (payload) => {
          const game = payload.new as any;
          const gameName = GAME_LABELS[game.game_type] || "a game";

          // Fetch challenger name
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", game.creator_id)
            .single();

          const name = profile?.display_name || "Someone";

          toast({
            title: "🎮 Game Invite!",
            description: `${name} challenged you to ${gameName}`,
            action: (
              <button
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-gold/90 transition-colors"
                onClick={() => navigate("/fun/my-games")}
              >
                View
              </button>
            ),
          });
        }
      )
      // Game accepted (I'm the creator)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `creator_id=eq.${user.id}`,
        },
        async (payload) => {
          const game = payload.new as any;
          const old = payload.old as any;

          // Only fire when status changes to "active" (accepted)
          if (old.status === "pending" && game.status === "active") {
            const gameName = GAME_LABELS[game.game_type] || "a game";

            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", game.opponent_id)
              .single();

            const name = profile?.display_name || "Your opponent";

            toast({
              title: "🎉 Challenge Accepted!",
              description: `${name} is ready to play ${gameName}`,
              action: (
                <button
                  className="rounded-md bg-gold px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-gold/90 transition-colors"
                  onClick={() => navigate(`/fun/play/${game.id}`)}
                >
                  Play Now
                </button>
              ),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, navigate]);
}
