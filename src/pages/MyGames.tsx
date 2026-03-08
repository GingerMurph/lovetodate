import { useEffect, useState } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, Check, X, Gamepad2, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GameRow {
  id: string;
  game_type: string;
  creator_id: string;
  opponent_id: string;
  status: string;
  current_turn: string | null;
  winner_id: string | null;
  created_at: string;
  creator_name?: string;
  opponent_name?: string;
}

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
  eight_ball_pool: "8 Ball Pool",
  whos_who: "Who's Who?",
};

export default function MyGames() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("games")
      .select("*")
      .or(`creator_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
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

  useEffect(() => {
    fetchGames();
  }, [user]);

  const respondToInvite = async (gameId: string, accept: boolean) => {
    if (!user) return;
    const newStatus = accept ? "active" : "declined";
    const { error } = await supabase
      .from("games")
      .update({
        status: newStatus,
        ...(accept ? { current_turn: user.id } : {}),
      })
      .eq("id", gameId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: accept ? "Game accepted!" : "Invite declined" });
      fetchGames();

      // Notify the challenger that the invite was accepted
      if (accept) {
        const game = games.find((g) => g.id === gameId);
        if (game) {
          supabase.functions.invoke("notify-game-accepted", {
            body: { challengerId: game.creator_id, gameType: game.game_type },
          }).catch(() => {});
        }
      }
    }
  };

  const pendingGames = games.filter((g) => g.status === "pending" && g.opponent_id === user?.id);
  const activeGames = games.filter((g) => g.status === "active");
  const completedGames = games.filter((g) => g.status === "completed");

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">My Games</h1>
          <Link to="/" className="ml-auto">
            <Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : games.length === 0 ? (
          <div className="text-center py-16">
            <Gamepad2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No games yet. Go play!</p>
            <Link to="/fun">
              <Button className="mt-4 gradient-gold text-primary-foreground">Browse Games</Button>
            </Link>
          </div>
        ) : (
          <>
            {pendingGames.length > 0 && (
              <section className="mb-8">
                <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Pending Invites</h2>
                <div className="space-y-3">
                  {pendingGames.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-xl border border-gold/30 bg-accent/30 p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{GAME_LABELS[g.game_type]}</p>
                        <p className="text-xs text-muted-foreground">from {g.creator_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => respondToInvite(g.id, false)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="gradient-gold text-primary-foreground" onClick={() => respondToInvite(g.id, true)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeGames.length > 0 && (
              <section className="mb-8">
                <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Active Games</h2>
                <div className="space-y-3">
                  {activeGames.map((g) => {
                    const opponentName = g.creator_id === user?.id ? g.opponent_name : g.creator_name;
                    const isMyTurn = g.current_turn === user?.id;
                    return (
                      <Link key={g.id} to={`/fun/play/${g.id}`}>
                        <div className="flex items-center justify-between rounded-xl border border-border p-4 hover:border-gold/30 transition-all cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-foreground">{GAME_LABELS[g.game_type]}</p>
                            <p className="text-xs text-muted-foreground">vs {opponentName}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isMyTurn ? "bg-gold/20 text-gold" : "bg-muted text-muted-foreground"}`}>
                            {isMyTurn ? "Your turn" : "Their turn"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {completedGames.length > 0 && (
              <section>
                <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Completed</h2>
                <div className="space-y-3">
                  {completedGames.map((g) => {
                    const opponentName = g.creator_id === user?.id ? g.opponent_name : g.creator_name;
                    const won = g.winner_id === user?.id;
                    const draw = !g.winner_id;
                    return (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border border-border p-4 opacity-70">
                        <div>
                          <p className="text-sm font-medium text-foreground">{GAME_LABELS[g.game_type]}</p>
                          <p className="text-xs text-muted-foreground">vs {opponentName}</p>
                        </div>
                        <span className={`text-xs font-semibold ${draw ? "text-muted-foreground" : won ? "text-green-500" : "text-red-500"}`}>
                          {draw ? "Draw" : won ? "Won!" : "Lost"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
