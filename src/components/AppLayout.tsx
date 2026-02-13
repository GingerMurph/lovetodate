import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Heart, Search, User, LogOut } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nav = [
    { to: "/discover", icon: Search, label: "Discover" },
    { to: "/likes", icon: Heart, label: "Likes" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/discover" className="font-serif text-xl text-gold">Love To Date</Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button variant={location.pathname === item.to ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="ml-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
