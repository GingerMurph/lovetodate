import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    q: "You find a wallet with £1,000 and an ID card. What do you do?",
    options: ["Return everything", "Keep the cash, return the wallet", "Hand it to the police", "Try to find the owner online"],
  },
  {
    q: "Your dream holiday destination?",
    options: ["Tropical beach paradise", "European city break", "Mountain adventure", "Road trip with no plan"],
  },
  {
    q: "It's Sunday morning. What are you doing?",
    options: ["Lie-in with coffee & Netflix", "Up early for a workout", "Brunch with friends", "Exploring somewhere new"],
  },
  {
    q: "You win the lottery. First thing you do?",
    options: ["Buy a house", "Travel the world", "Invest it wisely", "Quit your job immediately"],
  },
  {
    q: "Your ideal first date?",
    options: ["Dinner at a nice restaurant", "Walk & coffee somewhere scenic", "Something adventurous", "Comedy show or live music"],
  },
  {
    q: "You can only eat one cuisine for the rest of your life. Which one?",
    options: ["Italian", "Japanese", "Mexican", "Indian"],
  },
  {
    q: "Your partner surprises you with a weekend away. Where have they taken you?",
    options: ["Cosy countryside cabin", "Bustling capital city", "Spa & wellness retreat", "Camping under the stars"],
  },
  {
    q: "How do you handle disagreements?",
    options: ["Talk it out immediately", "Take space then discuss", "Write down my thoughts first", "Use humour to defuse tension"],
  },
  {
    q: "It's a rainy evening. What's the plan?",
    options: ["Board games & wine", "Cook a meal together", "Movie marathon on the sofa", "Head out regardless — rain won't stop us"],
  },
  {
    q: "What matters most in a relationship?",
    options: ["Trust & honesty", "Shared sense of humour", "Physical chemistry", "Supporting each other's goals"],
  },
  {
    q: "You get one superpower. What do you pick?",
    options: ["Time travel", "Read minds", "Fly anywhere instantly", "Speak every language"],
  },
  {
    q: "How do you recharge after a long week?",
    options: ["Solo time at home", "Out with friends", "Nature walk or hike", "Creative hobby (art, music, cooking)"],
  },
];

export const TOTAL_QUESTIONS = QUESTIONS.length;

interface Props {
  gameState: any;
  userId: string;
  isMyTurn: boolean;
  isCompleted: boolean;
  onAnswer: (answer: string) => void;
}

export default function HypotheticalQuestions({ gameState, userId, isMyTurn, isCompleted, onAnswer }: Props) {
  const questionOrder: number[] = gameState.questionOrder || Array.from({ length: TOTAL_QUESTIONS }, (_, i) => i);
  const qi = gameState.questionIndex || 0;
  const actualIndex = questionOrder[qi] ?? qi;
  const currentQ = QUESTIONS[actualIndex];
  const myAnswer = gameState.answers?.[qi]?.[userId];
  const allAnswers = gameState.answers || {};

  if (isCompleted) {
    return (
      <div className="space-y-6">
        <p className="text-center text-sm text-muted-foreground mb-4">Here's how you both answered:</p>
        {questionOrder.map((qIdx, i) => {
          const q = QUESTIONS[qIdx];
          if (!q) return null;
          const answers = allAnswers[i] || {};
          const keys = Object.keys(answers);
          if (keys.length === 0) return null;
          return (
            <div key={i} className="rounded-xl border border-border p-4">
              <p className="text-sm font-medium text-foreground mb-2">{q.q}</p>
              {keys.map((uid) => (
                <p key={uid} className={`text-xs ${uid === userId ? "text-gold" : "text-muted-foreground"}`}>
                  {uid === userId ? "You" : "Them"}: {answers[uid]}
                </p>
              ))}
              {keys.length >= 2 && answers[keys[0]] === answers[keys[1]] && (
                <p className="text-xs text-green-500 mt-1">✨ You matched!</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (!currentQ) return <p className="text-center text-muted-foreground">Waiting for results...</p>;

  if (myAnswer) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-foreground mb-2">Question {qi + 1} of {TOTAL_QUESTIONS}</p>
        <p className="text-base font-medium text-foreground mb-4">"{currentQ.q}"</p>
        <p className="text-sm text-gold">Your answer: {myAnswer}</p>
        <p className="text-xs text-muted-foreground mt-4">Waiting for opponent to answer...</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-2">Question {qi + 1} of {TOTAL_QUESTIONS}</p>
      <p className="text-base font-medium text-foreground mb-6">{currentQ.q}</p>
      <div className="space-y-3 max-w-sm mx-auto">
        {currentQ.options.map((opt) => (
          <Button
            key={opt}
            variant="outline"
            className="w-full justify-start text-left h-auto py-3 hover:border-gold/50"
            onClick={() => onAnswer(opt)}
            disabled={!isMyTurn}
          >
            {opt}
          </Button>
        ))}
      </div>
    </div>
  );
}
