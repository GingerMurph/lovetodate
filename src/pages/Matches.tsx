import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUnviewedMatches } from "@/hooks/useUnviewedMatches";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MapPin, MessageSquare, Sparkles, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { AvatarImage } from "@/components/AvatarImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import SubscriberBadge from "@/components/SubscriberBadge";
import { toast } from "sonner";

type MatchProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location_city: string | null;
  nationality: string | null;
  age: number | null;
  is_verified?: boolean;
  is_subscribed?: boolean;
};

const STARTER_PROMPTS = [
  "What's the best trip you've ever been on?",
  "If you could have dinner with anyone, who would it be?",
  "What's your go-to comfort food?",
  "What's something you're passionate about that surprises people?",
  "If you won the lottery tomorrow, what's the first thing you'd do?",
  "What's a skill you've always wanted to learn?",
  "Do you have a favourite hidden gem restaurant or café?",
  "What song always puts you in a good mood?",
  "What's the most spontaneous thing you've ever done?",
  "If we went on a date right now, where would you take me?",
];

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { markViewed } = useUnviewedMatches();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    markViewed();
    loadMatches();
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("likes-profiles");

    if (!error && data) {
      const sent: MatchProfile[] = data.sent || [];
      const received: MatchProfile[] = data.received || [];
      const sentIds = new Set(sent.map((p) => p.user_id));
      const receivedIds = new Set(received.map((p) => p.user_id));

      // Mutual matches: users in both sent and received
      const mutualIds = [...sentIds].filter((id) => receivedIds.has(id));
      const profileMap = new Map([...sent, ...received].map((p) => [p.user_id, p]));
      setMatches(mutualIds.map((id) => profileMap.get(id)!).filter(Boolean));
    }
    setLoading(false);
  };

  const getRandomStarter = () => {
    return STARTER_PROMPTS[Math.floor(Math.random() * STARTER_PROMPTS.length)];
  };

  const handleSendStarter = async (profile: MatchProfile) => {
    if (!user) return;
    setSendingTo(profile.user_id);

    const message = getRandomStarter();

    // Check if there's an unlocked connection
    const { data: connection } = await supabase
      .from("unlocked_connections")
      .select("id")
      .or(
        `and(unlocker_id.eq.${user.id},target_id.eq.${profile.user_id}),and(unlocker_id.eq.${profile.user_id},target_id.eq.${user.id})`
      )
      .maybeSingle();

    if (!connection) {
      toast.error("Connection not yet unlocked — try again shortly");
      setSendingTo(null);
      return;
    }

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: profile.user_id,
      content: message,
    });

    setSendingTo(null);

    if (error) {
      toast.error("Couldn't send message");
    } else {
      toast.success(`Sent: "${message}"`);
      navigate(`/messages/${profile.user_id}`);
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-2 font-serif text-2xl font-bold">
          Your <span className="text-gold">Matches</span>
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          People who like you back — start a conversation!
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading matches...
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium text-foreground">No matches yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone you like also likes you back, they'll appear here.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/discover")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Discover People
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((profile) => (
              <Card key={profile.user_id} className="overflow-hidden border-border bg-card">
                <div className="flex items-center gap-4 p-4">
                  <Link to={`/profile/${profile.user_id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
                    <AvatarImage avatarUrl={profile.avatar_url} displayName={profile.display_name} iconSize="h-6 w-6" />
                    {(profile.is_verified || profile.is_subscribed) && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5">
                        {profile.is_verified && <span className="bg-background rounded-full p-0.5"><VerifiedBadge size="sm" /></span>}
                        {profile.is_subscribed && <span className="bg-background rounded-full p-0.5"><SubscriberBadge size="sm" /></span>}
                      </div>
                    )}
                  </Link>
                  <Link to={`/profile/${profile.user_id}`} className="min-w-0 flex-1">
                    <h3 className="font-serif text-lg font-semibold truncate">
                      {profile.display_name}{profile.age ? `, ${profile.age}` : ""}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {profile.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location_city}</span>}
                      {profile.nationality && <span>• {profile.nationality}</span>}
                    </div>
                  </Link>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => navigate(`/messages/${profile.user_id}`)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-gold text-primary-foreground hover:bg-gold/90"
                      onClick={() => handleSendStarter(profile)}
                      disabled={sendingTo === profile.user_id}
                    >
                      {sendingTo === profile.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Ice Breaker</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Matches;
