import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Gamepad2, Target, Handshake } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface GameRow {
  game_type: string;
  status: string;
  winner_id: string | null;
  creator_id: string;
  opponent_id: string;
  created_at: string;
  creator_name?: string;
  opponent_name?: string;
}

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Questions",
};

export default function GameStatsSection() {
  const { user } = useAuth();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("games")
        .select("game_type, status, winner_id, creator_id, opponent_id, created_at")
        .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data?.length) {
        const userIds = [...new Set(data.flatMap((g) => [g.creator_id, g.opponent_id]))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);
        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => (nameMap[p.user_id] = p.display_name));

        setGames(
          data.map((g) => ({
            ...g,
            creator_name: nameMap[g.creator_id] || "Unknown",
            opponent_name: nameMap[g.opponent_id] || "Unknown",
          }))
        );
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading || !user) return null;

  const completed = games.filter((g) => g.status === "completed");
  if (completed.length === 0 && games.length === 0) return null;

  const wins = completed.filter((g) => g.winner_id === user.id).length;
  const losses = completed.filter((g) => g.winner_id && g.winner_id !== user.id).length;
  const draws = completed.filter((g) => !g.winner_id).length;
  const active = games.filter((g) => g.status === "active").length;
  const recent = completed.slice(0, 5);

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <h2 className="mb-6 text-center font-serif text-4xl font-bold text-[#0369a0]">
          Your <span className="text-gold">Game Stats</span>
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-muted-foreground">
          Track your wins, losses, and recent matches
        </p>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10">
          {[
            { label: "Wins", value: wins, icon: Trophy, accent: "text-green-500" },
            { label: "Losses", value: losses, icon: Target, accent: "text-red-500" },
            { label: "Draws", value: draws, icon: Handshake, accent: "text-muted-foreground" },
            { label: "Active", value: active, icon: Gamepad2, accent: "text-gold" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 text-center">
              <s.icon className={`h-5 w-5 mx-auto mb-2 ${s.accent}`} />
              <p className={`text-2xl font-bold ${s.accent}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent results */}
        {recent.length > 0 && (
          <div className="max-w-lg mx-auto">
            <h3 className="font-serif text-lg font-semibold text-foreground mb-4 text-center">Recent Results</h3>
            <div className="space-y-2">
              {recent.map((g, i) => {
                const opponentName = g.creator_id === user.id ? g.opponent_name : g.creator_name;
                const won = g.winner_id === user.id;
                const draw = !g.winner_id;
                return (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground w-20 shrink-0">
                        {GAME_LABELS[g.game_type] || g.game_type}
                      </span>
                      <span className="text-sm text-foreground">vs {opponentName}</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      draw ? "bg-muted text-muted-foreground" : won ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    }`}>
                      {draw ? "Draw" : won ? "Won" : "Lost"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <Link to="/fun">
            <Button variant="outline" className="gap-2 border-gold/30 text-gold hover:bg-gold/10">
              <Gamepad2 className="h-4 w-4" />
              Play More Games
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
