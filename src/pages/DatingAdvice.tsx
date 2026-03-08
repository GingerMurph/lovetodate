import { useState, useEffect } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, Lightbulb, Home } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Tip {
  title: string;
  content: string;
}

export default function DatingAdvice() {
  const navigate = useNavigate();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-content", {
          body: {
            prompt: "Generate 6 practical dating tips. Each tip should have a short title (3-5 words) and a helpful description (under 30 words). Return as JSON array with 'title' and 'content' fields.",
            type: "dating_advice",
          },
        });
        if (error) throw error;
        if (data?.items) setTips(data.items);
        else throw new Error("No items");
      } catch {
        setTips([
          { title: "Be Authentically You", content: "Don't pretend to be someone you're not. Genuine profiles attract genuine connections." },
          { title: "Ask Thoughtful Questions", content: "Show genuine curiosity about their life, passions, and dreams. Listen actively." },
          { title: "Quality Over Quantity", content: "Focus on meaningful conversations rather than messaging everyone at once." },
          { title: "Choose Great Photos", content: "Use clear, recent photos that show your personality. Smile — it's your best feature." },
          { title: "Be Patient", content: "Great connections take time. Don't rush the process or settle for less than you deserve." },
          { title: "Stay Safe", content: "Meet in public places first. Trust your instincts and take things at your own pace." },
        ]);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, []);

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Dating Advice</h1>
          <Link to="/" className="ml-auto">
            <Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Expert tips to help you make the most of your dating journey
        </p>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5">
                  <Skeleton className="h-4 w-1/2 mb-3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            : tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:border-gold/30">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Lightbulb className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-semibold text-foreground mb-1">{tip.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
                  </div>
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
