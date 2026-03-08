import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, Loader2 } from "lucide-react";

export const WHOS_WHO_TOTAL_ROUNDS = 8;

interface WhosWhoGameState {
  currentRound: number;
  questions: QuizQuestion[];
  scores: Record<string, number>;
  answers: Record<number, Record<string, string>>;
  generatedFor?: string; // tracks which pair this was generated for
}

interface QuizQuestion {
  questionText: string;
  correctAnswer: string; // the user_id whose profile the fact belongs to
  options: { label: string; userId: string }[];
  category: string;
}

interface Props {
  gameState: WhosWhoGameState;
  userId: string;
  creatorId: string;
  opponentId: string;
  isMyTurn: boolean;
  isCompleted: boolean;
  onAnswer: (newState: WhosWhoGameState) => Promise<void>;
}

// Profile fields we can quiz on
const QUIZ_FIELDS: {
  key: string;
  template: (val: string) => string;
  category: string;
}[] = [
  { key: "occupation", template: (v) => `Who works as a ${v}?`, category: "Career" },
  { key: "education", template: (v) => `Who has ${v} education?`, category: "Education" },
  { key: "location_city", template: (v) => `Who lives in ${v}?`, category: "Location" },
  { key: "smoking", template: (v) => `Who ${v === "Never" ? "never smokes" : v === "Socially" ? "smokes socially" : "smokes regularly"}?`, category: "Lifestyle" },
  { key: "drinking", template: (v) => `Who ${v === "Never" ? "never drinks" : v === "Socially" ? "drinks socially" : "drinks regularly"}?`, category: "Lifestyle" },
  { key: "children", template: (v) => `Who ${v === "Has children" ? "has children" : v === "Wants children" ? "wants children" : "doesn't want children"}?`, category: "Family" },
  { key: "religion", template: (v) => `Who identifies as ${v}?`, category: "Beliefs" },
  { key: "personality_type", template: (v) => `Who has the ${v} personality type?`, category: "Personality" },
  { key: "pets", template: (v) => `Who ${v === "Has pets" ? "has pets" : v === "Wants pets" ? "wants pets" : "has no pets"}?`, category: "Lifestyle" },
  { key: "nationality", template: (v) => `Whose nationality is ${v}?`, category: "Background" },
  { key: "ethnicity", template: (v) => `Who identifies as ${v}?`, category: "Background" },
  { key: "body_build", template: (v) => `Who describes their build as ${v}?`, category: "About" },
  { key: "bio", template: () => `Who wrote this bio?`, category: "Profile" },
];

const INTEREST_FIELDS = [
  { key: "interests", template: (v: string) => `Who listed "${v}" as an interest?`, category: "Interests" },
  { key: "favourite_music", template: (v: string) => `Who loves ${v} music?`, category: "Music" },
  { key: "favourite_sport", template: (v: string) => `Who enjoys ${v}?`, category: "Sports" },
  { key: "favourite_hobbies", template: (v: string) => `Who has ${v} as a hobby?`, category: "Hobbies" },
  { key: "favourite_film", template: (v: string) => `Who loves ${v} films?`, category: "Films" },
];

export async function generateWhosWhoQuestions(
  creatorId: string,
  opponentId: string
): Promise<QuizQuestion[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, occupation, education, location_city, smoking, drinking, children, religion, personality_type, pets, nationality, ethnicity, body_build, bio, interests, favourite_music, favourite_sport, favourite_hobbies, favourite_film")
    .in("user_id", [creatorId, opponentId]);

  if (!profiles || profiles.length < 2) return [];

  const p1 = profiles.find((p) => p.user_id === creatorId)!;
  const p2 = profiles.find((p) => p.user_id === opponentId)!;

  const questions: QuizQuestion[] = [];
  const options = [
    { label: p1.display_name || "Player 1", userId: p1.user_id },
    { label: p2.display_name || "Player 2", userId: p2.user_id },
  ];

  // Generate questions from scalar fields
  for (const field of QUIZ_FIELDS) {
    const v1 = (p1 as any)[field.key];
    const v2 = (p2 as any)[field.key];

    // Only create question if the values differ and at least one is filled
    if (v1 && v2 && v1 !== v2 && v1.trim() && v2.trim()) {
      // Pick one randomly
      const chosen = Math.random() > 0.5 ? p1 : p2;
      const val = (chosen as any)[field.key] as string;

      if (field.key === "bio") {
        // For bio, show a snippet
        const snippet = val.length > 80 ? val.substring(0, 80) + "…" : val;
        questions.push({
          questionText: `Who wrote: "${snippet}"`,
          correctAnswer: chosen.user_id,
          options: [...options].sort(() => Math.random() - 0.5),
          category: field.category,
        });
      } else {
        questions.push({
          questionText: field.template(val),
          correctAnswer: chosen.user_id,
          options: [...options].sort(() => Math.random() - 0.5),
          category: field.category,
        });
      }
    }
  }

  // Generate questions from array fields
  for (const field of INTEREST_FIELDS) {
    const arr1: string[] = (p1 as any)[field.key] || [];
    const arr2: string[] = (p2 as any)[field.key] || [];

    // Find unique items
    const uniqueTo1 = arr1.filter((i) => !arr2.includes(i));
    const uniqueTo2 = arr2.filter((i) => !arr1.includes(i));

    if (uniqueTo1.length > 0) {
      const pick = uniqueTo1[Math.floor(Math.random() * uniqueTo1.length)];
      questions.push({
        questionText: field.template(pick),
        correctAnswer: p1.user_id,
        options: [...options].sort(() => Math.random() - 0.5),
        category: field.category,
      });
    }
    if (uniqueTo2.length > 0) {
      const pick = uniqueTo2[Math.floor(Math.random() * uniqueTo2.length)];
      questions.push({
        questionText: field.template(pick),
        correctAnswer: p2.user_id,
        options: [...options].sort(() => Math.random() - 0.5),
        category: field.category,
      });
    }
  }

  // Shuffle and take up to TOTAL_ROUNDS
  return questions.sort(() => Math.random() - 0.5).slice(0, WHOS_WHO_TOTAL_ROUNDS);
}

export default function WhosWhoQuiz({
  gameState,
  userId,
  creatorId,
  opponentId,
  isMyTurn,
  isCompleted,
  onAnswer,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [localState, setLocalState] = useState<WhosWhoGameState>(gameState);

  useEffect(() => {
    setLocalState(gameState);
  }, [gameState]);

  // Generate questions on first load if not yet generated
  useEffect(() => {
    if (localState.questions && localState.questions.length > 0) return;
    if (!isMyTurn || generating) return;

    const generate = async () => {
      setGenerating(true);
      const questions = await generateWhosWhoQuestions(creatorId, opponentId);
      const newState: WhosWhoGameState = {
        ...localState,
        questions,
        generatedFor: `${creatorId}-${opponentId}`,
      };
      setLocalState(newState);
      await onAnswer(newState);
      setGenerating(false);
    };
    generate();
  }, [localState.questions, isMyTurn, creatorId, opponentId]);

  const questions = localState.questions || [];
  const currentRound = localState.currentRound || 0;
  const scores = localState.scores || {};
  const answers = localState.answers || {};
  const question = questions[currentRound];

  const myScore = scores[userId] || 0;
  const opponentScore = scores[userId === creatorId ? opponentId : creatorId] || 0;

  const handleSelect = (optionUserId: string) => {
    if (!isMyTurn || revealed || isCompleted || submitting) return;
    setSelected(optionUserId);
    setRevealed(true);
  };

  const handleNext = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);

    const isCorrect = selected === question.correctAnswer;
    const newScores = { ...scores };
    if (isCorrect) {
      newScores[userId] = (newScores[userId] || 0) + 1;
    }

    const newAnswers = { ...answers };
    newAnswers[currentRound] = {
      ...(newAnswers[currentRound] || {}),
      [userId]: selected,
    };

    const bothAnswered = Object.keys(newAnswers[currentRound] || {}).length === 2;
    const nextRound = bothAnswered ? currentRound + 1 : currentRound;
    const allDone = nextRound >= questions.length;

    const newState: WhosWhoGameState = {
      ...localState,
      currentRound: nextRound,
      scores: newScores,
      answers: newAnswers,
    };

    await onAnswer(newState);
    setSelected(null);
    setRevealed(false);
    setSubmitting(false);
  }, [selected, question, scores, userId, currentRound, answers, questions.length, localState, onAnswer]);

  if (generating || (!questions.length && !isCompleted)) {
    return (
      <div className="text-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto mb-4" />
        <p className="text-muted-foreground">Generating quiz from your profiles...</p>
      </div>
    );
  }

  if (questions.length === 0 && isCompleted) {
    return (
      <div className="text-center py-16">
        <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground">Not enough profile differences to generate questions. Fill out more of your profiles!</p>
      </div>
    );
  }

  // Game complete
  if (isCompleted || currentRound >= questions.length) {
    const iWon = myScore > opponentScore;
    const draw = myScore === opponentScore;
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">{draw ? "🤝" : iWon ? "🎉" : "😅"}</div>
        <h2 className="font-serif text-2xl font-bold text-foreground mb-2">
          {draw ? "It's a draw!" : iWon ? "You won!" : "They know you better!"}
        </h2>
        <div className="flex justify-center gap-8 my-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gold">{myScore}</p>
            <p className="text-xs text-muted-foreground">Your Score</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-muted-foreground">{opponentScore}</p>
            <p className="text-xs text-muted-foreground">Their Score</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Out of {questions.length} questions
        </p>
      </div>
    );
  }

  if (!question) return null;

  const alreadyAnswered = answers[currentRound]?.[userId];

  if (alreadyAnswered && !isMyTurn) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Waiting for opponent to answer...</p>
        <div className="flex justify-center gap-8 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gold">{myScore}</p>
            <p className="text-xs text-muted-foreground">Your Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{opponentScore}</p>
            <p className="text-xs text-muted-foreground">Their Score</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {currentRound + 1} of {questions.length}</span>
        <span className="text-gold font-semibold">{myScore} pts</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gold rounded-full transition-all duration-500"
          style={{ width: `${((currentRound + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Category badge */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <HelpCircle className="h-3 w-3 text-gold" />
          {question.category}
        </span>
      </div>

      {/* Question */}
      <div className="text-center px-4">
        <h3 className="font-serif text-xl font-bold text-foreground leading-snug">
          {question.questionText}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((opt) => {
          const isCorrect = opt.userId === question.correctAnswer;
          const isSelected = selected === opt.userId;

          let borderClass = "border-border hover:border-gold/30";
          let bgClass = "bg-card";
          let icon = null;

          if (revealed) {
            if (isCorrect) {
              borderClass = "border-green-500/50";
              bgClass = "bg-green-500/10";
              icon = <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />;
            } else if (isSelected && !isCorrect) {
              borderClass = "border-red-500/50";
              bgClass = "bg-red-500/10";
              icon = <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
            }
          }

          return (
            <button
              key={opt.userId}
              onClick={() => handleSelect(opt.userId)}
              disabled={revealed || !isMyTurn || isCompleted}
              className={`w-full flex items-center justify-between rounded-xl border ${borderClass} ${bgClass} p-4 transition-all text-left disabled:cursor-default`}
            >
              <span className="text-sm font-medium text-foreground">{opt.label}</span>
              {icon}
            </button>
          );
        })}
      </div>

      {/* Reveal result + next */}
      {revealed && (
        <div className="text-center animate-fade-in">
          <p className={`text-sm font-semibold mb-4 ${selected === question.correctAnswer ? "text-green-500" : "text-red-500"}`}>
            {selected === question.correctAnswer ? "✓ Correct!" : "✗ Wrong!"}
          </p>
          <Button
            onClick={handleNext}
            disabled={submitting}
            className="gradient-gold text-primary-foreground"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {currentRound + 1 >= questions.length ? "See Results" : "Next Question"}
          </Button>
        </div>
      )}
    </div>
  );
}
