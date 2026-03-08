import { useState, useEffect } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, Star, Quote } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const TESTIMONIAL_PROMPTS = [
  "Write a short, heartfelt testimonial from a fictional person who found love on a dating app. Include their first name, age, and city. Keep it under 40 words. Make it feel genuine and specific.",
  "Write a brief success story testimonial from someone who met their partner through online dating. Include name, age, city. Under 40 words. Make it warm and believable.",
  "Write a concise dating app success testimonial. Include the person's first name, age, location. Under 40 words. Focus on what made the experience special.",
];

interface Testimonial {
  text: string;
  name: string;
  rating: number;
}

export default function Testimonials() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const results = await Promise.all(
          TESTIMONIAL_PROMPTS.map(async (prompt) => {
            const { data, error } = await supabase.functions.invoke("generate-content", {
              body: { prompt, type: "testimonial" },
            });
            if (error) throw error;
            return {
              text: data?.content || "Love To Date helped me find someone truly special.",
              name: data?.name || "Happy User",
              rating: 5,
            };
          })
        );
        setTestimonials(results);
      } catch {
        setTestimonials([
          { text: "I never thought I'd find someone so perfect for me. Love To Date made it happen!", name: "Sarah, 28, London", rating: 5 },
          { text: "The quality of connections here is incredible. Met my partner within weeks.", name: "James, 34, Manchester", rating: 5 },
          { text: "Finally, a dating app that values genuine connections over endless swiping.", name: "Priya, 31, Birmingham", rating: 5 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Testimonials</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Real stories from people who found love through Love To Date
        </p>
        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))
            : testimonials.map((t, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5">
                  <Quote className="h-6 w-6 text-gold/40 mb-3" />
                  <p className="text-sm text-foreground mb-4 leading-relaxed italic">"{t.text}"</p>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-3.5 w-3.5 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{t.name}</p>
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
