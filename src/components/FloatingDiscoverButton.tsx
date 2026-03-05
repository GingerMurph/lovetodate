import { Link, useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const HIDDEN_ROUTES = ["/", "/auth", "/discover", "/reset-password", "/subscription"];
const HIDDEN_PREFIXES = ["/messages/"];

export default function FloatingDiscoverButton() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;
  if (HIDDEN_ROUTES.some((r) => location.pathname === r)) return null;
  if (HIDDEN_PREFIXES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <Link to="/discover" className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50">
      <Button
        size="lg"
        className="gradient-gold text-primary-foreground rounded-full shadow-lg shadow-gold/20 h-12 w-12 p-0 sm:w-auto sm:px-5 sm:gap-2"
      >
        <Search className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-semibold">Discover</span>
      </Button>
    </Link>
  );
}
