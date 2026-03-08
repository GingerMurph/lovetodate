import { useState, useEffect } from "react";
import BackgroundImage from "@/components/BackgroundImage";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BlogPost {
  title: string;
  excerpt: string;
  category: string;
}

export default function Blog() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-content", {
          body: {
            prompt: "Generate 4 dating blog post ideas. Each should have a catchy title (under 10 words), a brief excerpt (under 25 words), and a category (e.g. 'Relationships', 'First Dates', 'Self-Care', 'Communication'). Return as JSON array with 'title', 'excerpt', 'category' fields.",
            type: "blog",
          },
        });
        if (error) throw error;
        if (data?.items) setPosts(data.items);
        else throw new Error("No items");
      } catch {
        setPosts([
          { title: "5 Signs You've Found The One", excerpt: "How to recognise when a connection is truly special and worth pursuing.", category: "Relationships" },
          { title: "First Date Conversation Dos and Don'ts", excerpt: "Make a great impression with these simple conversation guidelines.", category: "First Dates" },
          { title: "Building Confidence Before Dating", excerpt: "Self-care practices that prepare you for meaningful connections.", category: "Self-Care" },
          { title: "The Art of Active Listening", excerpt: "Why truly hearing your date matters more than having the perfect reply.", category: "Communication" },
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
          <h1 className="font-serif text-xl text-gold">Blog</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12">
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Insights, stories, and advice for your love journey
        </p>
        <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6">
                  <Skeleton className="h-3 w-20 mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))
            : posts.map((post, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 cursor-pointer">
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-gold mb-2">{post.category}</span>
                  <h3 className="font-serif text-lg font-semibold text-foreground mb-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-gold">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>Read more</span>
                  </div>
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
