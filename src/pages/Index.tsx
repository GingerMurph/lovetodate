import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  CreditCard,
  Users,
  Star,
  Lightbulb,
  BookOpen,
  MessageCircle,
  Gamepad2,
  Crown,
  Sparkles,
  Brain,
  Eye,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import GameStatsSection from "@/components/GameStatsSection";
import logo from "@/assets/logo.png";
import BackgroundImage from "@/components/BackgroundImage";
import PendingGameInvites from "@/components/PendingGameInvites";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />

      {/* Nav */}
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="Love To Date logo" className="h-10 w-10 rounded-full object-cover shrink-0" />
            <span className="font-serif text-gold text-lg sm:text-2xl">
              LoveToDate<span className="hidden sm:inline">.co.uk</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/subscription">
              <Button variant="ghost" size="sm" className="text-gold gap-1.5">
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Premium</span>
              </Button>
            </Link>
            {loading ? (
              <div className="h-8 w-24" />
            ) : user ? (
              <>
                <Link to="/discover">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-semibold">
                    Browse Profiles
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSignOut}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost" size="sm" className="text-foreground">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-semibold">
                    Join for Free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(ellipse at 50% 0%, hsl(38 70% 55% / 0.4), transparent 70%)",
            }}
          />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-gold">Find Someone you would</p>
            <h1 className="mb-6 font-serif text-5xl font-bold leading-tight md:text-7xl lg:text-8xl">
              <span className="text-sky-700">Love To </span>
              <span className="text-gradient-gold">Date</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl font-light">
              Only pay when you find someone you would
              <span className="text-gold font-medium"> Love To Date</span>
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth?mode=signup">
                <Button
                  size="lg"
                  className="gradient-gold text-primary-foreground px-10 py-6 text-lg font-semibold shadow-lg shadow-gold/20"
                >
                  Join for Free
                </Button>
              </Link>
              <Link to="/subscription">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gold text-gold hover:bg-gold/10 px-8 py-6 text-lg font-semibold"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Sparkles className="h-3 w-3 text-gold" /> AI-Powered Matching
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Eye className="h-3 w-3 text-gold" /> See Who Likes You — Free
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground">
                <Shield className="h-3 w-3 text-gold" /> Affordable Subscriptions
              </span>
            </div>
            {user && (
              <div className="mt-8">
                <PendingGameInvites />
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-card/50">
          <div className="container mx-auto px-4">
            <h2 className="mb-16 text-center font-serif text-4xl font-bold text-[#0369a0]">
              How It <span className="text-gold">Works</span>
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Users,
                  title: "Browse Profiles",
                  desc: "Explore detailed profiles with photos, interests, and personality details. Completely free.",
                },
                {
                  icon: Heart,
                  title: "See Who Likes You",
                  desc: "Know exactly who's interested. Read their full profile before deciding.",
                },
                {
                  icon: CreditCard,
                  title: "Pay to connect",
                  desc: "Only pay when you've found someone you genuinely want to date. Exchange contact details instantly.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-border bg-card p-8 text-center transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5"
                >
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                    <item.icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="mb-3 font-serif text-xl font-semibold text-[#0369a0]">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI-Powered Matching - Key Differentiator */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold/5 to-transparent" />
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-2 mb-6">
              <Brain className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold text-gold">Most Advanced AI Matching</span>
            </div>
            <h2 className="mb-6 font-serif text-4xl font-bold text-foreground">
              AI That <span className="text-gold">Actually Understands</span> You
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-muted-foreground">
              Our advanced AI analyses 15+ dimensions of compatibility — from your values and lifestyle to how you actually make decisions in our games. No other dating site goes this deep.
            </p>
            
            {/* AI Features Grid */}
            <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto mb-12">
              {[
                {
                  icon: Sparkles,
                  title: "Deep Profile Analysis",
                  desc: "AI examines your bio, interests, values, lifestyle choices, and personality prompts",
                },
                {
                  icon: Gamepad2,
                  title: "Real Decision Matching",
                  desc: "Play games together — our AI uses your answers to measure true compatibility",
                },
                {
                  icon: Zap,
                  title: "Instant Conversation Starters",
                  desc: "AI generates personalised openers based on what you actually have in common",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="group rounded-2xl border border-gold/20 bg-card p-6 text-center transition-all hover:border-gold/40 hover:shadow-lg hover:shadow-gold/10"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold/10 group-hover:bg-gold/20 transition-colors">
                    <item.icon className="h-6 w-6 text-gold" />
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Compatibility Breakdown Preview */}
            <div className="max-w-md mx-auto bg-card rounded-2xl border border-border p-6 shadow-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">AI Compatibility Breakdown</p>
              <div className="grid grid-cols-5 gap-3 mb-4">
                {[
                  { label: "Values", pct: 92, color: "stroke-purple-500" },
                  { label: "Lifestyle", pct: 85, color: "stroke-blue-500" },
                  { label: "Goals", pct: 78, color: "stroke-green-500" },
                  { label: "Vibe", pct: 88, color: "stroke-pink-500" },
                  { label: "Fun", pct: 95, color: "stroke-orange-500" },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="relative h-10 w-10">
                      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          className={color}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14 * (1 - pct / 100)}`}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{pct}</span>
                    </div>
                    <span className="text-[8px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-foreground font-medium">87% Overall Match 🔥</p>
              <p className="text-xs text-muted-foreground mt-1">Based on values, lifestyle, goals, personality & shared interests</p>
            </div>
          </div>
        </section>

        {/* See Who Likes You - Key USP */}
        <section className="py-24 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 mb-6">
                  <Eye className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-600">No More Paying Blind</span>
                </div>
                <h2 className="mb-4 font-serif text-3xl font-bold text-foreground">
                  See Who <span className="text-gold">Likes You</span> — Before You Pay
                </h2>
                <p className="mb-6 text-muted-foreground">
                  Other dating sites hide who's interested until you pay. We don't. Browse their full profile, check compatibility, and only pay when you've found someone you'd genuinely Love To Date.
                </p>
                <ul className="space-y-3 text-sm text-left">
                  {[
                    "View full profiles of everyone who likes you",
                    "Run AI compatibility analysis before committing",
                    "No subscription required just to see interest",
                    "Only pay to unlock messaging with your best matches",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <span className="text-green-600 text-xs">✓</span>
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative">
                  {/* Mock notification cards */}
                  <div className="w-64 space-y-3">
                    {[
                      { name: "Sophie, 28", loc: "Manchester", match: "89%" },
                      { name: "James, 31", loc: "London", match: "82%" },
                      { name: "Emma, 26", loc: "Bristol", match: "91%" },
                    ].map((person, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm"
                        style={{ transform: `rotate(${(i - 1) * 2}deg)` }}
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold/30 to-rose-300/30 flex items-center justify-center">
                          <Heart className="h-4 w-4 text-gold fill-current" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{person.name}</p>
                          <p className="text-xs text-muted-foreground">{person.loc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gold">{person.match}</p>
                          <p className="text-[10px] text-muted-foreground">match</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute -top-4 -right-4 bg-gold text-primary-foreground rounded-full px-3 py-1 text-xs font-bold shadow-lg">
                    3 new likes!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Explore More */}
        <section className="py-24 bg-card/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-6 font-serif text-4xl font-bold text-[#0369a0]">
              Explore <span className="text-gold">More</span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-muted-foreground">
              Tips, stories, games, and everything you need for your dating journey
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 max-w-5xl mx-auto">
              {[
                { to: "/testimonials", icon: Star, label: "Testimonials", desc: "Real success stories" },
                { to: "/dating-advice", icon: Lightbulb, label: "Dating Advice", desc: "Expert tips" },
                { to: "/blog", icon: BookOpen, label: "Blog", desc: "Insights & stories" },
                {
                  to: "/conversation-starters",
                  icon: MessageCircle,
                  label: "Conversation Starters",
                  desc: "Break the ice",
                },
                { to: "/fun", icon: Gamepad2, label: "Fun Stuff", desc: "Games & challenges" },
              ].map((item, i) => (
                <Link key={i} to={item.to}>
                  <div className="group rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 h-full">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent group-hover:bg-gold/10 transition-colors">
                      <item.icon className="h-5 w-5 text-gold" />
                    </div>
                    <h3 className="font-serif text-base font-semibold text-foreground mb-1">{item.label}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Game Stats - only for logged in users */}
        {user && <GameStatsSection />}

        {/* Footer */}
        <footer className="border-t border-border py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="font-serif text-xl text-gold mb-2">Love To Date</p>
            <p className="text-sm text-muted-foreground">Only pay when you find someone you would Love To Date</p>
            <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
              <Link to="/terms" className="text-xs text-muted-foreground hover:text-gold transition-colors">Terms of Service</Link>
              <span className="text-muted-foreground/30">|</span>
              <Link to="/privacy" className="text-xs text-muted-foreground hover:text-gold transition-colors">Privacy Policy</Link>
              <span className="text-muted-foreground/30">|</span>
              <Link to="/cookies" className="text-xs text-muted-foreground hover:text-gold transition-colors">Cookie Policy</Link>
              <span className="text-muted-foreground/30">|</span>
              <a href="mailto:support@lovetodate.co.uk" className="text-xs text-muted-foreground hover:text-gold transition-colors">support@lovetodate.co.uk</a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              © {new Date().getFullYear()} lovetodate.co.uk. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
