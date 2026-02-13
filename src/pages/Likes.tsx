import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, User as UserIcon, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const Likes = () => {
  const { user } = useAuth();
  const [likedByMe, setLikedByMe] = useState<Profile[]>([]);
  const [likedMe, setLikedMe] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadLikes();
  }, [user]);

  const loadLikes = async () => {
    if (!user) return;
    setLoading(true);

    const [sentRes, receivedRes] = await Promise.all([
      supabase.from("likes").select("liked_id").eq("liker_id", user.id),
      supabase.from("likes").select("liker_id").eq("liked_id", user.id),
    ]);

    const sentIds = sentRes.data?.map((l) => l.liked_id) || [];
    const receivedIds = receivedRes.data?.map((l) => l.liker_id) || [];

    const [sentProfiles, receivedProfiles] = await Promise.all([
      sentIds.length > 0 ? supabase.from("profiles").select("*").in("user_id", sentIds) : { data: [] },
      receivedIds.length > 0 ? supabase.from("profiles").select("*").in("user_id", receivedIds) : { data: [] },
    ]);

    setLikedByMe(sentProfiles.data || []);
    setLikedMe(receivedProfiles.data || []);
    setLoading(false);
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const ProfileCard = ({ profile }: { profile: Profile }) => (
    <Link to={`/profile/${profile.user_id}`}>
      <Card className="group overflow-hidden border-border bg-card transition-all hover:border-gold/30">
        <div className="flex items-center gap-4 p-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><UserIcon className="h-6 w-6 text-muted-foreground/30" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-lg font-semibold truncate">
              {profile.display_name}{getAge(profile.date_of_birth) ? `, ${getAge(profile.date_of_birth)}` : ""}
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
          Your <span className="text-gold">Likes</span>
        </h1>

        <Tabs defaultValue="received">
          <TabsList className="w-full">
            <TabsTrigger value="received" className="flex-1">Liked You ({likedMe.length})</TabsTrigger>
            <TabsTrigger value="sent" className="flex-1">You Liked ({likedByMe.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : likedMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No one has liked you yet. Complete your profile to attract more attention!</p>
            ) : (
              likedMe.map((p) => <ProfileCard key={p.id} profile={p} />)
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 space-y-3">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading...</p>
            ) : likedByMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">You haven't liked anyone yet. Start discovering people!</p>
            ) : (
              likedByMe.map((p) => <ProfileCard key={p.id} profile={p} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Likes;
