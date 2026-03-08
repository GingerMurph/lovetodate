import { ArrowLeft, Home } from "lucide-react";
import BackgroundImage from "@/components/BackgroundImage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function CookiePolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Cookie Policy</h1>
          <Link to="/" className="ml-auto">
            <Button variant="ghost" size="icon"><Home className="h-5 w-5" /></Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <h2 className="font-serif text-foreground">1. What Are Cookies?</h2>
        <p className="text-muted-foreground">Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and improve your experience.</p>

        <h2 className="font-serif text-foreground">2. Cookies We Use</h2>

        <h3 className="font-serif text-foreground">Essential Cookies (Always Active)</h3>
        <p className="text-muted-foreground">These are necessary for the Service to function and cannot be disabled.</p>
        <ul className="text-muted-foreground">
          <li><strong>Authentication cookies:</strong> Keep you logged in securely (Supabase auth tokens)</li>
          <li><strong>Session cookies:</strong> Maintain your session state while browsing</li>
          <li><strong>Security cookies:</strong> Help prevent cross-site request forgery and other attacks</li>
          <li><strong>Cookie consent:</strong> Remembers your cookie preferences</li>
        </ul>

        <h3 className="font-serif text-foreground">Functional Cookies</h3>
        <p className="text-muted-foreground">These enhance your experience but are not strictly necessary.</p>
        <ul className="text-muted-foreground">
          <li><strong>Preference cookies:</strong> Remember your notification settings, theme, and display preferences</li>
          <li><strong>Game state cookies:</strong> Store temporary game data for a seamless experience</li>
        </ul>

        <h3 className="font-serif text-foreground">Analytics Cookies (Optional)</h3>
        <p className="text-muted-foreground">We may use anonymised analytics to understand how users interact with our Service. These cookies do not identify you personally.</p>

        <h2 className="font-serif text-foreground">3. Third-Party Cookies</h2>
        <ul className="text-muted-foreground">
          <li><strong>Stripe:</strong> Payment processing — sets cookies for fraud prevention and secure checkout</li>
          <li><strong>Agora:</strong> Video call functionality — may set cookies for connection quality</li>
        </ul>
        <p className="text-muted-foreground">We do not use advertising or tracking cookies. We do not allow third-party advertisers to set cookies on our Service.</p>

        <h2 className="font-serif text-foreground">4. Local Storage</h2>
        <p className="text-muted-foreground">In addition to cookies, we use browser local storage to:</p>
        <ul className="text-muted-foreground">
          <li>Store your authentication session securely</li>
          <li>Cache your cookie consent preferences</li>
          <li>Remember UI state preferences</li>
        </ul>

        <h2 className="font-serif text-foreground">5. Managing Cookies</h2>
        <p className="text-muted-foreground">You can manage cookies through:</p>
        <ul className="text-muted-foreground">
          <li><strong>Our cookie banner:</strong> Displayed on first visit, allowing you to accept or reject non-essential cookies</li>
          <li><strong>Browser settings:</strong> Most browsers allow you to block or delete cookies. Note that blocking essential cookies may prevent the Service from functioning</li>
        </ul>

        <h2 className="font-serif text-foreground">6. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>

        <h2 className="font-serif text-foreground">7. Contact</h2>
        <p className="text-muted-foreground">For questions about our use of cookies, contact us at <a href="mailto:support@lovetodate.co.uk" className="text-gold hover:underline">support@lovetodate.co.uk</a>.</p>
      </main>
    </div>
  );
}
