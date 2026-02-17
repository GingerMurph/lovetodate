import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { AvatarImage } from "@/components/AvatarImage";

type LikeProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  location_city: string | null;
  nationality: string | null;
  age: number | null;
};

const Likes = () => {
  const { user } = useAuth();
  const [likedByMe, setLikedByMe] = useState<LikeProfile[]>([]);
  const [likedMe, setLikedMe] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadLikes();
  }, [user]);

  const loadLikes = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("likes-profiles");

    if (!error && data) {
      setLikedByMe(data.sent || []);
      setLikedMe(data.received || []);
    }
    setLoading(false);
  };

  const ProfileCard = ({ profile }: { profile: LikeProfile }) => (
    <Link to={`/profile/${profile.user_id}`}>
      <Card className="group overflow-hidden border-border bg-card transition-all hover:border-gold/30">
        <div className="flex items-center gap-4 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
            <AvatarImage avatarUrl={profile.avatar_url} displayName={profile.display_name} iconSize="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-semibold truncate">
              {profile.display_name}{profile.age ? `, ${profile.age}` : ""}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {profile.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location_city}</span>}
              {profile.nationality && <span>• {profile.nationality}</span>}
            </div>
          </div>
          <Heart className="h-5 w-5 text-red-500 fill-current shrink-0" />
        </div>
      </Card>
    </Link>
  );

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 font-serif text-2xl font-bold">
          Love To <span className="text-gold">Date</span>
        </h1>

        <Tabs defaultValue="received">
          <TabsList className="w-full">
            <TabsTrigger value="received" className="flex-1">Love To Date You ({likedMe.length})</TabsTrigger>
            <TabsTrigger value="sent" className="flex-1">You'd Love To Date ({likedByMe.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : likedMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No one has liked you yet. Complete your profile to attract more attention!</p>
            ) : (
              likedMe.map((p) => <ProfileCard key={p.user_id} profile={p} />)
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : likedByMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">You haven't liked anyone yet. Start discovering people!</p>
            ) : (
              likedByMe.map((p) => <ProfileCard key={p.user_id} profile={p} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Likes;
