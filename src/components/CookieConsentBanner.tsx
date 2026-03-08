import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "ltd_cookie_consent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 animate-fade-in">
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/10">
            <Cookie className="h-5 w-5 text-gold" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground mb-1">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              We use essential cookies to keep you logged in and make the site work. We also use optional cookies to improve your experience.{" "}
              <Link to="/cookies" className="text-gold hover:underline">
                Read our Cookie Policy
              </Link>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gradient-gold text-primary-foreground text-xs"
                onClick={handleAccept}
              >
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={handleReject}
              >
                Essential Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
