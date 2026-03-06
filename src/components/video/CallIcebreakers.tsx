import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Gamepad2, X, RefreshCw } from "lucide-react";

const ICEBREAKER_QUESTIONS = [
  "What's the most spontaneous thing you've ever done?",
  "If you could live anywhere in the world, where would it be?",
  "What's your guilty pleasure TV show?",
  "What's the best meal you've ever had?",
  "If you had a time machine, where would you go?",
  "What's your most unpopular opinion?",
  "What's the best gift you've ever received?",
  "What would your dream weekend look like?",
  "What's on your bucket list?",
  "What's a skill you wish you had?",
  "What's your favourite way to spend a rainy day?",
  "If you could have dinner with anyone, who would it be?",
];

const WOULD_YOU_RATHER = [
  ["Travel to the past", "Travel to the future"],
  ["Always be overdressed", "Always be underdressed"],
  ["Give up social media", "Give up streaming services"],
  ["Have a personal chef", "Have a personal trainer"],
  ["Be famous", "Be incredibly wealthy but unknown"],
  ["Live by the beach", "Live in the mountains"],
  ["Never have to sleep", "Never have to eat"],
  ["Read minds", "Be invisible"],
];

const TRUTH_OR_DARE_TRUTHS = [
  "What's the most embarrassing thing on your phone?",
  "What's the biggest lie you've told on a date?",
  "What's your biggest pet peeve?",
  "What's the cheesiest chat-up line you've ever used?",
  "Have you ever stalked someone on social media?",
  "What's your most irrational fear?",
];

const TRUTH_OR_DARE_DARES = [
  "Do your best impression of a celebrity",
  "Show the last photo in your camera roll",
  "Sing a few lines of your favourite song",
  "Do a silly dance for 10 seconds",
  "Make a funny face and hold it for 5 seconds",
  "Tell a joke — it has to be bad",
];

type Tab = "questions" | "games";

interface CallIcebreakersProps {
  open: boolean;
  onClose: () => void;
}

export default function CallIcebreakers({ open, onClose }: CallIcebreakersProps) {
  const [tab, setTab] = useState<Tab>("questions");
  const [currentQ, setCurrentQ] = useState(() => Math.floor(Math.random() * ICEBREAKER_QUESTIONS.length));
  const [currentWYR, setCurrentWYR] = useState(() => Math.floor(Math.random() * WOULD_YOU_RATHER.length));
  const [gameMode, setGameMode] = useState<"wyr" | "tod" | null>(null);
  const [todType, setTodType] = useState<"truth" | "dare" | null>(null);
  const [currentTod, setCurrentTod] = useState(0);

  if (!open) return null;

  const nextQuestion = () => setCurrentQ((prev) => (prev + 1) % ICEBREAKER_QUESTIONS.length);
  const nextWYR = () => setCurrentWYR((prev) => (prev + 1) % WOULD_YOU_RATHER.length);
  const nextTod = () => {
    const list = todType === "truth" ? TRUTH_OR_DARE_TRUTHS : TRUTH_OR_DARE_DARES;
    setCurrentTod((prev) => (prev + 1) % list.length);
  };

  return (
    <div className="absolute top-14 left-2 right-2 bg-card/95 backdrop-blur-sm rounded-xl border border-border p-3 z-20 animate-in slide-in-from-top-4 max-h-[60vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          <Button
            variant={tab === "questions" ? "default" : "ghost"}
            size="sm"
            className={`h-7 text-xs gap-1 ${tab === "questions" ? "gradient-gold text-primary-foreground" : ""}`}
            onClick={() => setTab("questions")}
          >
            <MessageSquare className="h-3 w-3" /> Questions
          </Button>
          <Button
            variant={tab === "games" ? "default" : "ghost"}
            size="sm"
            className={`h-7 text-xs gap-1 ${tab === "games" ? "gradient-gold text-primary-foreground" : ""}`}
            onClick={() => setTab("games")}
          >
            <Gamepad2 className="h-3 w-3" /> Mini Games
          </Button>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {tab === "questions" && (
        <div className="text-center py-4">
          <p className="text-sm font-medium text-foreground mb-4 px-2">
            "{ICEBREAKER_QUESTIONS[currentQ]}"
          </p>
          <Button variant="outline" size="sm" onClick={nextQuestion} className="gap-1.5">
            <RefreshCw className="h-3 w-3" /> Next Question
          </Button>
        </div>
      )}

      {tab === "games" && !gameMode && (
        <div className="space-y-2 py-2">
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3 text-left"
            onClick={() => setGameMode("wyr")}
          >
            <span className="text-lg mr-2">🤔</span>
            <div>
              <p className="text-sm font-medium">Would You Rather</p>
              <p className="text-xs text-muted-foreground">Pick between two tricky choices</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start h-auto py-3 text-left"
            onClick={() => setGameMode("tod")}
          >
            <span className="text-lg mr-2">🎲</span>
            <div>
              <p className="text-sm font-medium">Truth or Dare</p>
              <p className="text-xs text-muted-foreground">Classic game, video call edition</p>
            </div>
          </Button>
        </div>
      )}

      {tab === "games" && gameMode === "wyr" && (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-3">Would You Rather...</p>
          <div className="space-y-2 mb-4">
            <div className="bg-gold/10 border border-gold/20 rounded-lg px-3 py-2.5">
              <p className="text-sm font-medium">🅰️ {WOULD_YOU_RATHER[currentWYR][0]}</p>
            </div>
            <p className="text-xs text-muted-foreground">— OR —</p>
            <div className="bg-gold/10 border border-gold/20 rounded-lg px-3 py-2.5">
              <p className="text-sm font-medium">🅱️ {WOULD_YOU_RATHER[currentWYR][1]}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="ghost" size="sm" onClick={() => setGameMode(null)} className="text-xs">← Back</Button>
            <Button variant="outline" size="sm" onClick={nextWYR} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Next
            </Button>
          </div>
        </div>
      )}

      {tab === "games" && gameMode === "tod" && !todType && (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm font-medium">Pick one!</p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              className="h-16 w-28 flex-col gap-1"
              onClick={() => { setTodType("truth"); setCurrentTod(Math.floor(Math.random() * TRUTH_OR_DARE_TRUTHS.length)); }}
            >
              <span className="text-lg">🤫</span>
              <span className="text-xs">Truth</span>
            </Button>
            <Button
              variant="outline"
              className="h-16 w-28 flex-col gap-1"
              onClick={() => { setTodType("dare"); setCurrentTod(Math.floor(Math.random() * TRUTH_OR_DARE_DARES.length)); }}
            >
              <span className="text-lg">🔥</span>
              <span className="text-xs">Dare</span>
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setGameMode(null)} className="text-xs">← Back</Button>
        </div>
      )}

      {tab === "games" && gameMode === "tod" && todType && (
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground mb-2">{todType === "truth" ? "🤫 Truth" : "🔥 Dare"}</p>
          <p className="text-sm font-medium mb-4 px-2">
            "{todType === "truth" ? TRUTH_OR_DARE_TRUTHS[currentTod] : TRUTH_OR_DARE_DARES[currentTod]}"
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="ghost" size="sm" onClick={() => setTodType(null)} className="text-xs">← Back</Button>
            <Button variant="outline" size="sm" onClick={nextTod} className="gap-1 text-xs">
              <RefreshCw className="h-3 w-3" /> Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
