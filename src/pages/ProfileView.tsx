import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MapPin, Ruler, Weight, Briefcase, GraduationCap, Wine, Cigarette, Baby, Globe, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const ProfileView = () => {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikedBack, setIsLikedBack] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    if (!userId || !user) return;
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId || !user) return;
    setLoading(true);

    const [profileRes, likeRes, likeBackRes, connectionRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("likes").select("id").eq("liker_id", user.id).eq("liked_id", userId).maybeSingle(),
      supabase.from("likes").select("id").eq("liker_id", userId).eq("liked_id", user.id).maybeSingle(),
      supabase.from("unlocked_connections").select("id")
        .or(`and(unlocker_id.eq.${user.id},target_id.eq.${userId}),and(unlocker_id.eq.${userId},target_id.eq.${user.id})`)
        .maybeSingle(),
    ]);

    setProfile(profileRes.data);
    setIsLiked(!!likeRes.data);
    setIsLikedBack(!!likeBackRes.data);
    setIsUnlocked(!!connectionRes.data);
    setLoading(false);
  };

  const handleLike = async () => {
    if (!user || !userId) return;
    if (isLiked) {
      await supabase.from("likes").delete().eq("liker_id", user.id).eq("liked_id", userId);
      setIsLiked(false);
      toast("Like removed");
    } else {
      const { error } = await supabase.from("likes").insert({ liker_id: user.id, liked_id: userId });
      if (error) { toast.error(error.message); return; }
      setIsLiked(true);
      toast.success("Liked!");
    }
  };

  const handleUnlock = async () => {
    if (!user || !userId) return;
    // TODO: Integrate Stripe payment of £1 here
    const { error } = await supabase.from("unlocked_connections").insert({ unlocker_id: user.id, target_id: userId });
    if (error) { toast.error(error.message); return; }
    setIsUnlocked(true);
    toast.success("Connection unlocked! You can now exchange contact details.");
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000);
  };

  const formatEnum = (val: string | null) => val?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || null;

  if (loading) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div></AppLayout>;
  if (!profile) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Profile not found</div></AppLayout>;

  const age = getAge(profile.date_of_birth);

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="h-40 w-40 overflow-hidden rounded-full border-2 border-gold/30 bg-secondary mb-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><UserIcon className="h-16 w-16 text-muted-foreground/30" /></div>
            )}
          </div>
          <h1 className="font-serif text-3xl font-bold">
            {profile.display_name}{age ? `, ${age}` : ""}
          </h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            {profile.location_city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{profile.location_city}{profile.location_country ? `, ${profile.location_country}` : ""}</span>}
            {profile.nationality && <span className="flex items-center gap-1"><Globe className="h-4 w-4" />{profile.nationality}</span>}
          </div>
          {profile.relationship_goal && (
            <Badge variant="outline" className="mt-3 border-gold/30 text-gold">{formatEnum(profile.relationship_goal)}</Badge>
          )}
        </div>

        {/* Actions */}
        {!isOwnProfile && (
          <div className="mb-6 flex justify-center gap-3">
            <Button onClick={handleLike} variant={isLiked ? "default" : "outline"} className={isLiked ? "gradient-gold text-primary-foreground" : "border-gold/30"}>
              <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
              {isLiked ? "Liked" : "Like"}
            </Button>
            {!isUnlocked ? (
              <Button onClick={handleUnlock} className="gradient-gold text-primary-foreground">
                <Lock className="h-4 w-4 mr-2" />
                Unlock for £1
              </Button>
            ) : (
              <Badge className="bg-green-600 text-white px-4 py-2">✓ Connected</Badge>
            )}
          </div>
        )}

        {/* Mutual like indicator */}
        {!isOwnProfile && isLiked && isLikedBack && (
          <div className="mb-6 text-center">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">💕 It's a mutual like!</Badge>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <Card className="mb-4 border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">About</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p></CardContent>
          </Card>
        )}

        {/* Physical */}
        <Card className="mb-4 border-border bg-card">
          <CardHeader><CardTitle className="font-serif text-lg">Physical Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              {profile.height_cm && (
                <div className="rounded-lg bg-secondary p-3">
                  <Ruler className="mx-auto mb-1 h-5 w-5 text-gold" />
                  <p className="text-lg font-semibold">{profile.height_cm}cm</p>
                  <p className="text-xs text-muted-foreground">Height</p>
                </div>
              )}
              {profile.weight_kg && (
                <div className="rounded-lg bg-secondary p-3">
                  <Weight className="mx-auto mb-1 h-5 w-5 text-gold" />
                  <p className="text-lg font-semibold">{profile.weight_kg}kg</p>
                  <p className="text-xs text-muted-foreground">Weight</p>
                </div>
              )}
              {profile.body_build && (
                <div className="rounded-lg bg-secondary p-3">
                  <UserIcon className="mx-auto mb-1 h-5 w-5 text-gold" />
                  <p className="text-lg font-semibold capitalize">{profile.body_build}</p>
                  <p className="text-xs text-muted-foreground">Build</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle */}
        <Card className="mb-4 border-border bg-card">
          <CardHeader><CardTitle className="font-serif text-lg">Lifestyle</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {profile.occupation && (
                <div className="flex items-center gap-3 text-sm"><Briefcase className="h-4 w-4 text-gold shrink-0" /><span>{profile.occupation}</span></div>
              )}
              {profile.education && (
                <div className="flex items-center gap-3 text-sm"><GraduationCap className="h-4 w-4 text-gold shrink-0" /><span>{profile.education}</span></div>
              )}
              {profile.smoking && (
                <div className="flex items-center gap-3 text-sm"><Cigarette className="h-4 w-4 text-gold shrink-0" /><span>Smoking: {formatEnum(profile.smoking)}</span></div>
              )}
              {profile.drinking && (
                <div className="flex items-center gap-3 text-sm"><Wine className="h-4 w-4 text-gold shrink-0" /><span>Drinking: {formatEnum(profile.drinking)}</span></div>
              )}
              {profile.children && (
                <div className="flex items-center gap-3 text-sm"><Baby className="h-4 w-4 text-gold shrink-0" /><span>Children: {formatEnum(profile.children)}</span></div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-3 text-sm"><UserIcon className="h-4 w-4 text-gold shrink-0" /><span>{formatEnum(profile.gender)}</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact details - only if unlocked */}
        {isUnlocked && !isOwnProfile && (
          <Card className="border-gold/30 bg-accent/30">
            <CardHeader><CardTitle className="font-serif text-lg text-gold">🔓 Connection Unlocked</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You've unlocked this connection! You can now reach out to {profile.display_name}. 
                Exchange emails or contact details to start your conversation.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfileView;
