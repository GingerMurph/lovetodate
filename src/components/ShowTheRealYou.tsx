import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Plus, X, MessageCircleHeart, Check } from "lucide-react";

const AVAILABLE_PROMPTS = [
  "The way to my heart is...",
  "My most controversial opinion is...",
  "A life goal of mine is...",
  "I'm looking for someone who...",
  "My ideal Sunday looks like...",
  "The one thing I'd want you to know about me is...",
  "I geek out on...",
  "My love language is...",
  "The best trip I ever took was...",
  "I'm at my happiest when...",
  "Something that surprises people about me is...",
  "Together, we could...",
];

const MIN_PROMPTS = 5;
const MAX_PROMPTS = 12;
const MAX_ANSWER_LENGTH = 300;

type PromptAnswer = {
  id?: string;
  prompt_text: string;
  answer_text: string;
  display_order: number;
  _editing?: boolean;
};

export default function ShowTheRealYou() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<PromptAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingPrompt, setAddingPrompt] = useState(false);
  const [selectedNewPrompt, setSelectedNewPrompt] = useState("");

  useEffect(() => {
    if (!user) return;
    loadPrompts();
  }, [user]);

  const loadPrompts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profile_prompts")
      .select("id, prompt_text, answer_text, display_order")
      .eq("user_id", user.id)
      .order("display_order");
    if (data) setPrompts(data);
    setLoading(false);
  };

  const usedPrompts = new Set(prompts.map((p) => p.prompt_text));
  const availableForAdd = AVAILABLE_PROMPTS.filter((p) => !usedPrompts.has(p));

  const handleAddPrompt = () => {
    if (!selectedNewPrompt) return;
    setPrompts((prev) => [
      ...prev,
      { prompt_text: selectedNewPrompt, answer_text: "", display_order: prev.length },
    ]);
    setSelectedNewPrompt("");
    setAddingPrompt(false);
  };

  const handleUpdateAnswer = (index: number, answer: string) => {
    if (answer.length > MAX_ANSWER_LENGTH) return;
    setPrompts((prev) => prev.map((p, i) => (i === index ? { ...p, answer_text: answer } : p)));
  };

  const handleRemovePrompt = (index: number) => {
    setPrompts((prev) => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, display_order: i })));
  };

  const handleSave = async () => {
    if (!user) return;

    const filledPrompts = prompts.filter((p) => p.answer_text.trim().length > 0);
    if (filledPrompts.length < MIN_PROMPTS) {
      toast.error(`Please answer at least ${MIN_PROMPTS} prompts to save.`);
      return;
    }

    setSaving(true);
    try {
      // Delete existing and re-insert
      await supabase.from("profile_prompts").delete().eq("user_id", user.id);

      const rows = filledPrompts.map((p, i) => ({
        user_id: user.id,
        prompt_text: p.prompt_text.slice(0, 200),
        answer_text: p.answer_text.trim().slice(0, MAX_ANSWER_LENGTH),
        display_order: i,
      }));

      const { error } = await supabase.from("profile_prompts").insert(rows);
      if (error) throw error;
      toast.success("Your prompts have been saved!");
      await loadPrompts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save prompts");
    }
    setSaving(false);
  };

  const answeredCount = prompts.filter((p) => p.answer_text.trim().length > 0).length;

  if (loading) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <MessageCircleHeart className="h-5 w-5 text-gold" />
          Show the Real You
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Your profile goes beyond photos. Share your personality through prompts, express your values, and show potential matches what makes you unique.
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className={`text-xs font-medium ${answeredCount >= MIN_PROMPTS ? "text-green-500" : "text-muted-foreground"}`}>
            {answeredCount >= MIN_PROMPTS && <Check className="h-3 w-3 inline mr-1" />}
            {answeredCount}/{MIN_PROMPTS} minimum answered
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompts.map((prompt, index) => (
          <div key={`${prompt.prompt_text}-${index}`} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-gold">{prompt.prompt_text}</p>
              <button
                type="button"
                onClick={() => handleRemovePrompt(index)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {prompt.answer_text.trim().length === 0 && !prompt._editing ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrompts((prev) => prev.map((p, i) => (i === index ? { ...p, _editing: true } : p)))}
                className="w-full border-gold/30 text-gold hover:bg-gold/10 gap-1.5"
              >
                <MessageCircleHeart className="h-3.5 w-3.5" />
                Answer this prompt
              </Button>
            ) : (
              <>
                <Textarea
                  value={prompt.answer_text}
                  onChange={(e) => handleUpdateAnswer(index, e.target.value)}
                  placeholder="Type your answer..."
                  rows={2}
                  className="resize-none text-sm"
                  maxLength={MAX_ANSWER_LENGTH}
                  autoFocus={prompt._editing}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {prompt.answer_text.length}/{MAX_ANSWER_LENGTH}
                </p>
              </>
            )}
          </div>
        ))}

        {prompts.length < MAX_PROMPTS && (
          <>
            {addingPrompt ? (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select value={selectedNewPrompt} onValueChange={setSelectedNewPrompt}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a prompt..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableForAdd.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" size="sm" onClick={handleAddPrompt} disabled={!selectedNewPrompt} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingPrompt(false); setSelectedNewPrompt(""); }}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddingPrompt(true)}
                className="w-full border-dashed border-gold/30 text-gold hover:bg-gold/10 gap-2"
              >
                <Plus className="h-4 w-4" />
                Add a prompt ({prompts.length}/{MAX_PROMPTS})
              </Button>
            )}
          </>
        )}

        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || answeredCount < MIN_PROMPTS}
          className="w-full gradient-gold text-primary-foreground gap-2"
        >
          {saving ? "Saving..." : (
            <>
              <Sparkles className="h-4 w-4" />
              Save Prompts
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
