import { ArrowLeft, Grid3X3, Circle, HelpCircle, Gamepad2, Trophy } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GAMES = [
  {
    id: "noughts_crosses",
    title: "Noughts & Crosses",
    desc: "Classic Tic-Tac-Toe. Challenge someone you'd love to date!",
    icon: Grid3X3,
    color: "text-blue-500",
  },
  {
    id: "connect4",
    title: "Connect 4",
    desc: "Drop your pieces and connect four in a row to win.",
    icon: Circle,
    color: "text-red-500",
  },
  {
    id: "hypothetical_questions",
    title: "Hypothetical Questions",
    desc: "Answer fun scenarios together. Your answers improve compatibility!",
    icon: HelpCircle,
    color: "text-purple-500",
  },
];

export default function FunStuff() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchPending = async () => {
      const { count } = await supabase
        .from("games")
        .select("*", { count: "exact", head: true })
        .eq("opponent_id", user.id)
        .eq("status", "pending");
      setPendingCount(count || 0);
    };
    fetchPending();

    const channel = supabase
      .channel("game-invites")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "games", filter: `opponent_id=eq.${user.id}` }, () => fetchPending())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Fun Stuff</h1>
          {pendingCount > 0 && (
            <span className="gradient-gold text-primary-foreground text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
              {pendingCount}
            </span>
          )}
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground mb-4 max-w-xl mx-auto">
          Play games with people you'd love to date. Your answers and play style feed into compatibility!
        </p>

        {pendingCount > 0 && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-xl border border-gold/30 bg-accent/50 text-center">
            <p className="text-sm text-foreground font-medium">
              🎮 You have {pendingCount} game invite{pendingCount > 1 ? "s" : ""} waiting!
            </p>
            <Link to="/fun/my-games">
              <Button size="sm" className="mt-2 gradient-gold text-primary-foreground">View Invites</Button>
            </Link>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto mb-12">
          {GAMES.map((game) => (
            <Link key={game.id} to={`/fun/${game.id}`}>
              <div className="rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 cursor-pointer h-full">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                  <game.icon className={`h-7 w-7 ${game.color}`} />
                </div>
                <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{game.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{game.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link to="/fun/my-games">
            <Button variant="outline" className="gap-2">
              <Trophy className="h-4 w-4" />
              My Games
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
