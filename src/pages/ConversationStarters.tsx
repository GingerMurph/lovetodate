import { useState, useEffect } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, MessageCircle, RefreshCw, Home, Forward, Loader2 } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { AvatarImage } from "@/components/AvatarImage";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LikeProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location_city: string | null;
  age: number | null;
};

export default function ConversationStarters() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [starters, setStarters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [forwardQuestion, setForwardQuestion] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<LikeProfile[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

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

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const { data, error } = await supabase.functions.invoke("likes-profiles");
      if (error) throw error;
      // Combine received likes and sent likes (people they've interacted with)
      const received: LikeProfile[] = data?.received || [];
      const sent: LikeProfile[] = data?.sent || [];
      // Deduplicate by user_id, prioritising received
      const map = new Map<string, LikeProfile>();
      received.forEach((p) => map.set(p.user_id, p));
      sent.forEach((p) => { if (!map.has(p.user_id)) map.set(p.user_id, p); });
      setRecipients(Array.from(map.values()));
    } catch {
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const openForward = (question: string) => {
    setForwardQuestion(question);
    loadRecipients();
  };

  const sendQuestion = async (recipientId: string) => {
    if (!user || !forwardQuestion) return;
    setSending(recipientId);
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: recipientId,
        content: forwardQuestion,
      });
      if (error) {
        if (error.message?.includes("policy")) {
          toast.error("You need to be connected with this person to send messages");
        } else {
          toast.error("Failed to send message");
        }
        return;
      }
      toast.success("Question sent!");
      setForwardQuestion(null);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Conversation Starters</h1>
          <Link to="/" className="ml-auto">
            <Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button>
          </Link>
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
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))
            : starters.map((s, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-gold/30 hover:bg-card/90">
                  <MessageCircle className="h-4 w-4 text-gold shrink-0" />
                  <p className="text-sm text-foreground flex-1">{s}</p>
                  {user && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-gold"
                      onClick={() => openForward(s)}
                      title="Send to someone"
                    >
                      <Forward className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
        </div>
      </main>

      <Dialog open={!!forwardQuestion} onOpenChange={(open) => { if (!open) setForwardQuestion(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">Send Question</DialogTitle>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 mb-3">
            <p className="text-sm text-foreground italic">"{forwardQuestion}"</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Choose someone to send this to:</p>
          {loadingRecipients ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No one has liked your profile yet. Keep discovering!
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recipients.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => sendQuestion(p.user_id)}
                  disabled={sending === p.user_id}
                  className="flex items-center gap-3 w-full rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-gold/30 hover:bg-card/90 disabled:opacity-50"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-secondary">
                    <AvatarImage avatarUrl={p.avatar_url} displayName={p.display_name} iconSize="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {p.display_name}{p.age ? `, ${p.age}` : ""}
                    </p>
                    {p.location_city && (
                      <p className="text-xs text-muted-foreground truncate">{p.location_city}</p>
                    )}
                  </div>
                  {sending === p.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <Forward className="h-4 w-4 text-gold shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
