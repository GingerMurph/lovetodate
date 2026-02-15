import { useState, useEffect } from "react";
import { AvatarImage } from "@/components/AvatarImage";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Heart, MapPin, Ruler, Weight, Briefcase, GraduationCap, Wine, Cigarette, Baby, Globe, Lock, User as UserIcon, Loader2, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

type ViewProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  gender: string | null;
  body_build: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  location_city: string | null;
  location_country: string | null;
  nationality: string | null;
  occupation: string | null;
  education: string | null;
  smoking: string | null;
  drinking: string | null;
  children: string | null;
  interests: string[] | null;
  relationship_goal: string | null;
  looking_for: string | null;
  age: number | null;
  is_paused: boolean;
};

const ProfileView = () => {
  const { userId } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikedBack, setIsLikedBack] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !user) return;
    loadProfile();
  }, [userId, user]);

  const loadProfile = async () => {
    if (!userId || !user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("view-profile", {
      body: { userId },
    });

    if (!error && data && !data.error) {
      setProfile(data.profile);
      setIsLiked(data.isLiked);
      setIsLikedBack(data.isLikedBack);
      setIsUnlocked(data.isUnlocked);
      setIsOwnProfile(data.isOwnProfile);
    }
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

  const [unlocking, setUnlocking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pausing, setPausing] = useState(false);

  const handleTogglePause = async () => {
    if (!user || !profile) return;
    setPausing(true);
    const newPaused = !profile.is_paused;
    const { error } = await supabase.from("profiles").update({ is_paused: newPaused } as any).eq("user_id", user.id);
    setPausing(false);
    if (error) {
      toast.error("Failed to update account status");
      return;
    }
    setProfile({ ...profile, is_paused: newPaused });
    toast.success(newPaused ? "Account paused" : "Account unpaused");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-account");
    setDeleting(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to delete account");
      return;
    }
    await signOut();
    navigate("/");
    toast.success("Your account has been deleted.");
  };

  const handleUnlock = async () => {
    if (!user || !userId) return;
    setUnlocking(true);
    const { data, error } = await supabase.functions.invoke("create-unlock-payment", {
      body: { targetUserId: userId },
    });
    setUnlocking(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Payment failed");
      return;
    }
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const formatEnum = (val: string | null) => val?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || null;

  if (loading) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div></AppLayout>;
  if (!profile) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Profile not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          <div className="h-40 w-40 overflow-hidden rounded-full border-2 border-gold/30 bg-secondary mb-4">
            <AvatarImage avatarUrl={profile.avatar_url} displayName={profile.display_name} />
          </div>
          <h1 className="font-serif text-3xl font-bold">
            {profile.display_name}{profile.age ? `, ${profile.age}` : ""}
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
              <Button onClick={handleUnlock} disabled={unlocking} className="gradient-gold text-primary-foreground">
                {unlocking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                {unlocking ? "Processing..." : "Unlock for £1"}
              </Button>
            ) : (
              <>
                <Badge className="bg-green-600 text-white px-4 py-2">✓ Connected</Badge>
                <Button onClick={() => navigate(`/messages/${userId}`)} className="gradient-gold text-primary-foreground">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </>
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

        {/* Account Management - own profile only */}
        {isOwnProfile && (
          <Card className="mt-6 border-border">
            <CardHeader><CardTitle className="font-serif text-lg">Account Management</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Pause Account */}
              <div>
                <h3 className="text-sm font-medium mb-1">Pause Account</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {profile.is_paused
                    ? "Your account is paused. Your profile is hidden from discovery. Unpause to become visible again."
                    : "Temporarily hide your profile from discovery. Your data will be kept safe."}
                </p>
                <Button
                  variant={profile.is_paused ? "default" : "outline"}
                  disabled={pausing}
                  onClick={handleTogglePause}
                >
                  {pausing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {profile.is_paused ? "Unpause Account" : "Pause Account"}
                </Button>
              </div>

              {/* Delete Account */}
              <div className="border-t border-destructive/30 pt-6">
                <h3 className="text-sm font-medium text-destructive mb-1">Delete Account</h3>
                <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data. This action cannot be undone.</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      {deleting ? "Deleting..." : "Delete My Account"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your account, profile, photos, likes, and connections. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        )}

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
