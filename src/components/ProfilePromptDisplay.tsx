import { MessageCircleHeart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PromptAnswer = {
  prompt_text: string;
  answer_text: string;
};

interface ProfilePromptDisplayProps {
  prompts: PromptAnswer[];
  /** Compact mode for swipe cards — shows only first 1-2 */
  compact?: boolean;
}

export default function ProfilePromptDisplay({ prompts, compact = false }: ProfilePromptDisplayProps) {
  if (!prompts || prompts.length === 0) return null;

  const displayed = compact ? prompts.slice(0, 2) : prompts;

  if (compact) {
    return (
      <div className="space-y-1.5 px-1">
        {displayed.map((p, i) => (
          <div key={i} className="rounded-md bg-secondary/50 px-2.5 py-1.5">
            <p className="text-[10px] font-medium text-gold leading-tight">{p.prompt_text}</p>
            <p className="text-[11px] text-foreground leading-snug mt-0.5 line-clamp-2">{p.answer_text}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="mb-4 border-border bg-card">
      <CardHeader>
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <MessageCircleHeart className="h-5 w-5 text-gold" />
          Show the Real You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayed.map((p, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-sm font-medium text-gold mb-1">{p.prompt_text}</p>
            <p className="text-sm text-foreground leading-relaxed">{p.answer_text}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
