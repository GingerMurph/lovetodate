import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Gamepad2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PendingGame {
  id: string;
  game_type: string;
  creator_id: string;
  created_at: string;
  creator_name?: string;
}

const GAME_TYPE_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
  eight_ball_pool: "8 Ball Pool",
  whos_who: "Who's Who",
};

export default function PendingGameInvites() {
  const { user } = useAuth();
  const [games, setGames] = useState<PendingGame[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchPendingGames = async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, game_type, creator_id, created_at")
        .eq("opponent_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) return;

      // Fetch creator display names
      const creatorIds = [...new Set(data.map((g) => g.creator_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", creatorIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);

      setGames(
        data.map((g) => ({
          ...g,
          creator_name: nameMap.get(g.creator_id) || "Someone",
        }))
      );
    };

    fetchPendingGames();

    // Listen for realtime changes
    const channel = supabase
      .channel("pending-game-invites")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `opponent_id=eq.${user.id}`,
        },
        () => {
          fetchPendingGames();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const visibleGames = games.filter((g) => !dismissed.has(g.id));

  if (visibleGames.length === 0) return null;

  return (
    <div className="w-full max-w-lg mx-auto space-y-3 px-4">
      {visibleGames.map((game) => (
        <div
          key={game.id}
          className="relative flex items-center gap-3 rounded-xl border border-gold/30 bg-card p-4 shadow-md shadow-gold/5 animate-in slide-in-from-top-2 duration-300"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10">
            <Gamepad2 className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {game.creator_name} invited you to play!
            </p>
            <p className="text-xs text-muted-foreground">
              {GAME_TYPE_LABELS[game.game_type] || game.game_type}
            </p>
          </div>
          <Link to={`/fun/play/${game.id}`}>
            <Button size="sm" className="gradient-gold text-primary-foreground font-semibold shrink-0">
              Play
            </Button>
          </Link>
          <button
            onClick={() => setDismissed((prev) => new Set(prev).add(game.id))}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
