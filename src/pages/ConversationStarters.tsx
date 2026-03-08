import { useState, useEffect } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, MessageCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationStarters() {
  const navigate = useNavigate();
  const [starters, setStarters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          prompt: "Generate 8 fun, creative conversation starters for a dating app. Each should be a single question under 15 words. Make them playful, thoughtful, and varied. Return as JSON array of strings.",
          type: "conversation_starters",
        },
      });
      if (error) throw error;
      if (data?.items) setStarters(data.items);
      else throw new Error("No items");
    } catch {
      setStarters([
        "What's the most spontaneous thing you've ever done?",
        "If you could live anywhere for a year, where would it be?",
        "What's your secret talent nobody knows about?",
        "Would you rather travel to the past or the future?",
        "What's the best meal you've ever had?",
        "If you could master any skill overnight, what would it be?",
        "What's your go-to karaoke song?",
        "What does your perfect Sunday look like?",
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

  return (
    <div className="min-h-screen bg-background">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Conversation Starters</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <p className="text-muted-foreground max-w-xl mx-auto mb-4">
            Break the ice with these creative conversation starters
          </p>
          <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Generate new starters
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            : starters.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border p-4 transition-all hover:border-gold/30 hover:bg-accent/50">
                  <MessageCircle className="h-4 w-4 text-gold shrink-0" />
                  <p className="text-sm text-foreground">{s}</p>
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
