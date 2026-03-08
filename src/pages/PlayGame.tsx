import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import NoughtsCrossesBoard from "@/components/games/NoughtsCrossesBoard";
import Connect4Board from "@/components/games/Connect4Board";
import HypotheticalQuestions, { TOTAL_QUESTIONS } from "@/components/games/HypotheticalQuestions";
import EightBallPool from "@/components/games/EightBallPool";
import WhosWhoQuiz, { WHOS_WHO_TOTAL_ROUNDS } from "@/components/games/WhosWhoQuiz";

interface GameData {
  id: string;
  game_type: string;
  creator_id: string;
  opponent_id: string;
  status: string;
  current_turn: string | null;
  game_state: any;
  winner_id: string | null;
}

export default function PlayGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchGame = async () => {
    if (!gameId) return;
    const { data, error } = await supabase.from("games").select("*").eq("id", gameId).single();
    if (error || !data) {
      toast({ title: "Game not found", variant: "destructive" });
      navigate("/fun/my-games");
      return;
    }
    setGame(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchGame();

    if (!gameId) return;
    const channel = supabase
      .channel(`game-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (payload) => {
        setGame(payload.new as GameData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const updateGame = async (newState: any, newTurn: string | null, winnerId?: string | null) => {
    if (!gameId || !user) return;
    const update: any = {
      game_state: newState,
      current_turn: newTurn,
    };
    if (winnerId !== undefined) {
      update.winner_id = winnerId;
      update.status = "completed";
    }
    await supabase.from("games").update(update).eq("id", gameId);
    await supabase.from("game_moves").insert({
      game_id: gameId,
      player_id: user.id,
      move_data: newState,
    });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading game...</p></div>;
  if (!game || !user) return null;

  const isMyTurn = game.current_turn === user.id;
  const isCompleted = game.status === "completed";
  const mySymbol = game.creator_id === user.id ? "X" : "O";
  const opponentId = game.creator_id === user.id ? game.opponent_id : game.creator_id;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/fun/my-games")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">
            {game.game_type === "noughts_crosses" ? "Noughts & Crosses" : game.game_type === "connect4" ? "Connect 4" : game.game_type === "eight_ball_pool" ? "8 Ball Pool" : "Hypothetical Questions"}
          </h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8 max-w-md">
        {!isCompleted && (
          <p className={`text-center text-sm font-medium mb-6 ${isMyTurn ? "text-gold" : "text-muted-foreground"}`}>
            {isMyTurn ? "Your turn!" : "Waiting for opponent..."}
          </p>
        )}
        {isCompleted && (
          <p className="text-center text-sm font-semibold mb-6">
            {!game.winner_id ? (
              <span className="text-muted-foreground">It's a draw!</span>
            ) : game.winner_id === user.id ? (
              <span className="text-green-500">🎉 You won!</span>
            ) : (
              <span className="text-red-500">You lost. Better luck next time!</span>
            )}
          </p>
        )}

        {game.game_type === "noughts_crosses" && (
          <NoughtsCrossesBoard
            board={game.game_state.board}
            mySymbol={mySymbol}
            isMyTurn={isMyTurn && !isCompleted}
            onMove={async (index) => {
              const newBoard = [...game.game_state.board];
              newBoard[index] = mySymbol;
              const winner = checkNCWinner(newBoard);
              const draw = !winner && newBoard.every((c: string | null) => c !== null);
              await updateGame(
                { board: newBoard },
                winner || draw ? null : opponentId,
                winner ? user.id : draw ? null : undefined
              );
            }}
          />
        )}

        {game.game_type === "connect4" && (
          <Connect4Board
            board={game.game_state.board}
            myColor={game.creator_id === user.id ? "red" : "yellow"}
            isMyTurn={isMyTurn && !isCompleted}
            onMove={async (col) => {
              const newBoard = game.game_state.board.map((r: any[]) => [...r]);
              for (let row = 5; row >= 0; row--) {
                if (!newBoard[row][col]) {
                  newBoard[row][col] = game.creator_id === user.id ? "red" : "yellow";
                  break;
                }
              }
              const winner = checkC4Winner(newBoard, game.creator_id === user.id ? "red" : "yellow");
              const draw = !winner && newBoard[0].every((c: string | null) => c !== null);
              await updateGame(
                { board: newBoard },
                winner || draw ? null : opponentId,
                winner ? user.id : draw ? null : undefined
              );
            }}
          />
        )}

        {game.game_type === "hypothetical_questions" && (
          <HypotheticalQuestions
            gameState={game.game_state}
            userId={user.id}
            isMyTurn={isMyTurn && !isCompleted}
            isCompleted={isCompleted}
            onAnswer={async (answer) => {
              const newState = { ...game.game_state };
              if (!newState.answers) newState.answers = {};
              if (!newState.answers[newState.questionIndex]) newState.answers[newState.questionIndex] = {};
              newState.answers[newState.questionIndex][user.id] = answer;

              const bothAnswered = Object.keys(newState.answers[newState.questionIndex]).length === 2;
              if (bothAnswered && newState.questionIndex < TOTAL_QUESTIONS - 1) {
                newState.questionIndex = newState.questionIndex + 1;
              }

              const allDone = bothAnswered && newState.questionIndex >= TOTAL_QUESTIONS - 1;
              await updateGame(
                newState,
                allDone ? null : opponentId,
                allDone ? null : undefined
              );
              if (allDone) {
                await supabase.from("games").update({ status: "completed" }).eq("id", gameId);
              }
            }}
          />
        )}

        {game.game_type === "eight_ball_pool" && (
          <EightBallPool
            gameState={game.game_state}
            userId={user.id}
            creatorId={game.creator_id}
            isMyTurn={isMyTurn && !isCompleted}
            isCompleted={isCompleted}
            onShot={async (newState) => {
              const winnerId = newState.gameOver
                ? newState.winner === "player1"
                  ? game.creator_id
                  : newState.winner === "player2"
                  ? game.opponent_id
                  : newState.winner
                : undefined;
              const nextTurn = newState.currentPlayer === "player1" ? game.creator_id : game.opponent_id;
              await updateGame(
                newState,
                newState.gameOver ? null : nextTurn,
                newState.gameOver ? (winnerId || null) : undefined
              );
            }}
          />
        )}
      </main>
    </div>
  );
}

function checkNCWinner(board: (string | null)[]): boolean {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return lines.some(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
}

function checkC4Winner(board: (string | null)[][], color: string): boolean {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c] !== color) continue;
      // Horizontal
      if (c + 3 < 7 && board[r][c+1] === color && board[r][c+2] === color && board[r][c+3] === color) return true;
      // Vertical
      if (r + 3 < 6 && board[r+1][c] === color && board[r+2][c] === color && board[r+3][c] === color) return true;
      // Diagonal down-right
      if (r + 3 < 6 && c + 3 < 7 && board[r+1][c+1] === color && board[r+2][c+2] === color && board[r+3][c+3] === color) return true;
      // Diagonal down-left
      if (r + 3 < 6 && c - 3 >= 0 && board[r+1][c-1] === color && board[r+2][c-2] === color && board[r+3][c-3] === color) return true;
    }
  }
  return false;
}
