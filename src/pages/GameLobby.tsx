import { useState, useEffect } from "react";
import { TOTAL_QUESTIONS } from "@/components/games/HypotheticalQuestions";
import { ArrowLeft, Send, CheckCircle, Gamepad2, Trophy } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GAME_LABELS: Record<string, string> = {
  noughts_crosses: "Noughts & Crosses",
  connect4: "Connect 4",
  hypothetical_questions: "Hypothetical Questions",
  eight_ball_pool: "8 Ball Pool",
  whos_who: "Who's Who?",
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
  const [invitedName, setInvitedName] = useState<string | null>(null);

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

    const shuffledOrder = Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i)
      .sort(() => Math.random() - 0.5);

    const initialState = gameType === "noughts_crosses"
      ? { board: Array(9).fill(null) }
      : gameType === "connect4"
      ? { board: Array(6).fill(null).map(() => Array(7).fill(null)) }
      : gameType === "eight_ball_pool"
      ? (await import("@/components/games/EightBallPool")).createInitialPoolState()
      : gameType === "whos_who"
      ? { currentRound: 0, questions: [], scores: {}, answers: {} }
      : { questionIndex: 0, answers: {}, questionOrder: shuffledOrder };

    const { error } = await supabase.from("games").insert({
      game_type: gameType,
      creator_id: user.id,
      opponent_id: opponentId,
      status: "pending",
      current_turn: user.id,
      game_state: initialState as any,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const name = connections.find((c) => c.user_id === opponentId)?.display_name || "them";
      setInvitedName(name);
      toast({ title: "Invite sent!", description: "They'll be notified to play." });

      // Send notification (fire-and-forget)
      supabase.functions.invoke("send-game-notification", {
        body: { recipientId: opponentId, gameType },
      }).catch(() => {});
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
        {invitedName ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Invite Sent!</h2>
            <p className="text-muted-foreground mb-8">
              Waiting for <span className="text-gold font-medium">{invitedName}</span> to accept your challenge
            </p>

            <div className="rounded-2xl border border-border bg-card p-6 mb-6 text-left">
              <h3 className="font-serif text-sm font-semibold text-foreground mb-3">What happens next?</h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">1.</span>
                  {invitedName} will get a notification about your invite
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">2.</span>
                  Once they accept, you'll both take turns playing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold mt-0.5">3.</span>
                  Your results feed into compatibility scores!
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setInvitedName(null)}
              >
                <Send className="h-4 w-4" />
                Invite Someone Else
              </Button>
              <Link to="/fun/my-games">
                <Button className="gradient-gold text-primary-foreground gap-2 w-full">
                  <Trophy className="h-4 w-4" />
                  View My Games
                </Button>
              </Link>
            </div>

            <Link to="/fun" className="inline-block mt-6">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <Gamepad2 className="h-4 w-4" />
                Back to Fun Stuff
              </Button>
            </Link>
          </div>
        ) : (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}
