import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Button } from "@/components/ui/button";
import { Heart, Search, User, LogOut, MessageSquare } from "lucide-react";
import logo from "@/assets/logo.jpeg";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const nav = [
    { to: "/discover", icon: Search, label: "Discover", badge: 0 },
    { to: "/likes", icon: Heart, label: "Likes", badge: 0 },
    { to: "/messages", icon: MessageSquare, label: "Messages", badge: unreadCount },
    { to: "/profile", icon: User, label: "Profile", badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/discover" className="flex items-center gap-2">
            <img src={logo} alt="Love To Date logo" className="h-8 w-8 rounded-full object-cover" />
            <span className="font-serif text-xl text-gold">Love To Date</span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className="relative">
                <Button variant={location.pathname === item.to ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
                {item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 gradient-gold text-primary-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="ml-2 gap-1.5">
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Logout</span>
            </Button>
          </nav>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
