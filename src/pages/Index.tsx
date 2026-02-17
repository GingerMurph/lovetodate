import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Shield, CreditCard, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src={logo} alt="Love To Date logo" className="h-10 w-10 rounded-full object-cover shrink-0" />
            <span className="font-serif text-gold text-lg sm:text-2xl">LoveToDate<span className="hidden sm:inline">.co.uk</span></span>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            {user ?
            <Link to="/discover">
                <Button size="sm" className="gradient-gold text-primary-foreground font-semibold">Browse Profiles</Button>
              </Link> :

            <>
                <Link to="/auth?mode=login">
                  <Button variant="ghost" size="sm" className="text-foreground">Sign In</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="gradient-gold text-primary-foreground font-semibold">Join Free</Button>
                </Link>
              </>
            }
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-card" />
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(ellipse at 50% 0%, hsl(38 70% 55% / 0.3), transparent 70%)'
          }} />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-gold">Affordable Dating</p>
            <h1 className="mb-6 font-serif text-5xl font-bold leading-tight md:text-7xl lg:text-8xl">
              <span className="text-sky-700">Love To </span>
              <span className="text-gradient-gold">Date</span>
            </h1>
            <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground md:text-xl font-light">Only pay when it is someone you would <span className="text-gold font-medium">Love To Date</span></p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-gold text-primary-foreground px-10 py-6 text-lg font-semibold shadow-lg shadow-gold/20">
                  Join for Free
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground">No subscriptions. Just £1 per connection.</p>
            </div>
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
              { icon: Users, title: "Browse Profiles", desc: "Explore detailed profiles with photos, interests, and personality details. Completely free." },
              { icon: Heart, title: "See Who Likes You", desc: "Know exactly who's interested. Read their full profile before deciding." },
              { icon: CreditCard, title: "Pay £1 To Connect", desc: "Only pay when you've found someone you genuinely want to date. Exchange contact details instantly." }].
              map((item, i) =>
              <div key={i} className="group rounded-2xl border border-border bg-card p-8 text-center transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
                    <item.icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="mb-3 font-serif text-xl font-semibold text-[#0369a0]">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Why different */}
        <section className="py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="mb-6 font-serif text-4xl font-bold text-[#0369a0]">
              Why We're <span className="text-gold">Different</span>
            </h2>
            <p className="mx-auto mb-12 max-w-2xl text-muted-foreground">
              No monthly fees bleeding your wallet. No endless swiping into the void. 
              Just real connections worth paying for.
            </p>
            <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
              {[
              { icon: Shield, title: "No Subscriptions", desc: "Never pay for features you don't use. Only pay when you find someone special." },
              { icon: Heart, title: "Quality Over Quantity", desc: "Detailed profiles mean better matches. Know who you're connecting with." }].
              map((item, i) =>
              <div key={i} className="flex items-start gap-4 rounded-xl border border-border p-6 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <item.icon className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-serif text-lg font-semibold text-[#0369a0]">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="font-serif text-xl text-gold mb-2">Love To Date</p>
            <p className="text-sm text-muted-foreground">Only pay when it is someone you would Love To Date</p>
            <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} lovetodate.co.uk. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>);

};

export default Index;