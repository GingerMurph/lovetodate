import { useState, useEffect } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
};

interface Connection {
  user_id: string;
  display_name: string;
}

export default function GameLobby() {
  const { gameType } = useParams<{ gameType: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchConnections = async () => {
      // Get users who have liked the current user or vice versa
      const { data: likes } = await supabase
        .from("likes")
        .select("liker_id, liked_id")
        .or(`liker_id.eq.${user.id},liked_id.eq.${user.id}`);

      if (!likes?.length) {
        setLoading(false);
        return;
      }

      const userIds = [...new Set(likes.map((l) => (l.liker_id === user.id ? l.liked_id : l.liker_id)))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      setConnections(profiles || []);
      setLoading(false);
    };
    fetchConnections();
  }, [user]);

  const inviteToGame = async (opponentId: string) => {
    if (!user || !gameType) return;
    setSending(opponentId);

    const initialState = gameType === "noughts_crosses"
      ? { board: Array(9).fill(null) }
      : gameType === "connect4"
      ? { board: Array(6).fill(null).map(() => Array(7).fill(null)) }
      : { questionIndex: 0, answers: {} };

    const { error } = await supabase.from("games").insert({
      game_type: gameType as any,
      creator_id: user.id,
      opponent_id: opponentId,
      status: "pending",
      current_turn: user.id,
      game_state: initialState,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invite sent!", description: "They'll be notified to play." });
      navigate("/fun/my-games");
    }
    setSending(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">{GAME_LABELS[gameType || ""] || "Game"}</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-md">
        <h2 className="font-serif text-lg font-semibold text-foreground mb-2 text-center">Invite someone to play</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Choose from people you've connected with
        </p>

        {loading ? (
          <p className="text-center text-muted-foreground">Loading...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No connections yet. Like some profiles first!</p>
            <Button onClick={() => navigate("/discover")} className="gradient-gold text-primary-foreground">
              Discover People
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((c) => (
              <div key={c.user_id} className="flex items-center justify-between rounded-xl border border-border p-4 hover:border-gold/30 transition-all">
                <p className="text-sm font-medium text-foreground">{c.display_name}</p>
                <Button
                  size="sm"
                  className="gradient-gold text-primary-foreground gap-1.5"
                  onClick={() => inviteToGame(c.user_id)}
                  disabled={sending === c.user_id}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending === c.user_id ? "Sending..." : "Invite"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
