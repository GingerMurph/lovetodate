import { useState, useEffect, useRef, useCallback } from "react";
import { AvatarImage } from "@/components/AvatarImage";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Heart, MapPin, Ruler, Weight, Briefcase, GraduationCap, Wine, Cigarette, Baby, Globe, Lock, User as UserIcon, Loader2, Trash2, MessageSquare, Music, Film, Dumbbell, Gamepad2, Brain, Vote, ThumbsDown, ArrowLeft, Ban, Sparkles, Crown, UtensilsCrossed } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import VerifiedBadge from "@/components/VerifiedBadge";
import acornLogo from "@/assets/logo.png";
import ProfilePromptDisplay from "@/components/ProfilePromptDisplay";
import SubscriberBadge from "@/components/SubscriberBadge";
import { useSubscription } from "@/hooks/useSubscription";

type ViewProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  photo_urls: string[];
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
  political_beliefs: string | null;
  favourite_music: string | null;
  favourite_film: string | null;
  favourite_sport: string | null;
  favourite_hobbies: string | null;
  personality_type: string | null;
  distance_miles: number | null;
  is_verified: boolean;
  is_subscribed: boolean;
  non_negotiables: string[] | null;
  prompts?: { prompt_text: string; answer_text: string }[];
};

const MutualLikePrompt = ({ profileName, userId, isUnlocked, freeConnectionAvailable, onConnectionClaimed }: {
  profileName: string;
  userId: string;
  isUnlocked: boolean;
  freeConnectionAvailable: boolean;
  onConnectionClaimed: () => void;
}) => {
  const { subscribed } = useSubscription();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);

  const handleClaimFree = async () => {
    setClaiming(true);
    const { data, error } = await supabase.functions.invoke("claim-free-connection", {
      body: { targetUserId: userId },
    });
    setClaiming(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to claim free connection");
      return;
    }
    toast.success("🎉 Free connection unlocked! You can now message each other.");
    onConnectionClaimed();
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="text-center">
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">💕 It's a mutual like!</Badge>
      </div>
      {!subscribed && !isUnlocked && (
        <Card className="border-gold/30 bg-gradient-to-br from-card to-accent/30">
          <CardContent className="py-5 text-center space-y-3">
            <Heart className="h-8 w-8 text-gold mx-auto fill-current" />
            <h3 className="font-serif text-lg font-bold">
              You and {profileName} both want to date!
            </h3>
            {freeConnectionAvailable ? (
              <>
                <p className="text-sm text-muted-foreground">
                  🎉 <strong className="text-gold">Launch Offer:</strong> Your first month is completely FREE! Unlock messaging and exchange contact details with {profileName} right now.
                </p>
                <Button onClick={handleClaimFree} disabled={claiming} className="gradient-gold text-primary-foreground">
                  {claiming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Heart className="h-4 w-4 mr-2" />}
                  {claiming ? "Unlocking..." : "Claim Free Connection"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Subscribe to start messaging and exchange contact details. No more paying blindly — only pay when you find someone you'd <strong className="text-gold">Love To Date</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button onClick={() => navigate("/subscription")} className="gradient-gold text-primary-foreground">
                    <Crown className="h-4 w-4 mr-2" />
                    See Plans from £1.54/week
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const ProfileView = () => {
  const { userId } = useParams();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { fromDiscover?: boolean; discoverIndex?: number } | null;
  const fromDiscover = navState?.fromDiscover ?? false;
  const discoverIndex = navState?.discoverIndex ?? 0;
  const [profile, setProfile] = useState<ViewProfile | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isLikedBack, setIsLikedBack] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [freeConnectionAvailable, setFreeConnectionAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [compatScore, setCompatScore] = useState<{
    score: number;
    summary: string;
    hasGameData?: boolean;
    gameMatchPercent?: number;
    dimensions?: { values: number; lifestyle: number; goals: number; personality: number; interests: number };
    commonalities?: string[];
    conversationStarters?: string[];
    strengthsNote?: string;
    watchOutNote?: string;
  } | null>(null);
  const [loadingCompat, setLoadingCompat] = useState(false);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [scoreRevealed, setScoreRevealed] = useState(false);

  // Swipe-to-go-back gesture (from left edge)
  const swipeRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const hapticFired = useRef(false);

  // Swipe left/right on card to like/pass
  const cardSwipeRef = useRef<{ x: number; y: number } | null>(null);
  const [cardSwipeX, setCardSwipeX] = useState(0);

  const handlePageTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches[0].clientX > 40) return;
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    hapticFired.current = false;
  }, []);

  const handlePageTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const dx = e.touches[0].clientX - swipeRef.current.x;
    const dy = e.touches[0].clientY - swipeRef.current.y;
    if (dx > 0 && dx > Math.abs(dy)) {
      const progress = Math.min(dx / 150, 1);
      setSwipeProgress(progress);
      if (progress >= 0.5 && !hapticFired.current) {
        hapticFired.current = true;
        navigator.vibrate?.(15);
      } else if (progress < 0.5) {
        hapticFired.current = false;
      }
    }
  }, []);

  const goBackToDiscover = useCallback(() => {
    if (fromDiscover) {
      navigate("/discover", { state: { resumeIndex: discoverIndex } });
    } else {
      navigate(-1);
    }
  }, [fromDiscover, discoverIndex, navigate]);

  const handlePageTouchEnd = useCallback(() => {
    if (!swipeRef.current) return;
    if (swipeProgress >= 0.5) {
      goBackToDiscover();
    }
    setSwipeProgress(0);
    swipeRef.current = null;
  }, [swipeProgress, goBackToDiscover]);

  // Card swipe handlers for like/pass (touch + mouse)
  const cardSwipeLocked = useRef(false); // lock axis once determined
  const handleCardPointerStart = useCallback((x: number, y: number) => {
    cardSwipeRef.current = { x, y };
    cardSwipeLocked.current = false;
  }, []);

  const handleCardPointerMove = useCallback((x: number, y: number) => {
    if (!cardSwipeRef.current) return;
    const dx = x - cardSwipeRef.current.x;
    const dy = y - cardSwipeRef.current.y;
    // Lock to horizontal axis after 10px movement
    if (!cardSwipeLocked.current && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      cardSwipeLocked.current = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical dominant — cancel card swipe
        cardSwipeRef.current = null;
        return;
      }
    }
    if (cardSwipeLocked.current) {
      setCardSwipeX(dx);
    }
  }, []);

  const [isDraggingCard, setIsDraggingCard] = useState(false);


  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    if (!userId || !user) return;
    loadProfile();
  }, [userId, user, myLocation]);

  const loadProfile = async () => {
    if (!userId || !user) return;
    setLoading(true);

    const { data, error } = await supabase.functions.invoke("view-profile", {
      body: { userId, ...(myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : {}) },
    });

    if (!error && data && !data.error) {
      setProfile(data.profile);
      setIsLiked(data.isLiked);
      setIsLikedBack(data.isLikedBack);
      setIsUnlocked(data.isUnlocked);
      setIsOwnProfile(data.isOwnProfile);
      setFreeConnectionAvailable(data.freeConnectionAvailable ?? false);
    }
    setLoading(false);
  };

  const fetchCompatibility = async () => {
    if (!userId || !user || !profile || isOwnProfile) return;
    setLoadingCompat(true);
    setScoreRevealed(false);
    setDisplayedScore(0);
    const { data, error } = await supabase.functions.invoke("compatibility-score", {
      body: { partnerId: userId },
    });
    if (!error && data && !data.error) {
      setCompatScore({
        score: data.score,
        summary: data.summary,
        hasGameData: data.hasGameData,
        gameMatchPercent: data.gameMatchPercent,
        dimensions: data.dimensions,
        commonalities: data.commonalities,
        conversationStarters: data.conversationStarters,
        strengthsNote: data.strengthsNote,
        watchOutNote: data.watchOutNote,
      });
      // Trigger count-up animation
      const target = data.score;
      const duration = 1200;
      const steps = 40;
      const increment = target / steps;
      let current = 0;
      let step = 0;
      const timer = setInterval(() => {
        step++;
        current = Math.min(Math.round(increment * step), target);
        setDisplayedScore(current);
        if (step >= steps) {
          clearInterval(timer);
          setDisplayedScore(target);
          setTimeout(() => setScoreRevealed(true), 200);
        }
      }, duration / steps);
    }
    setLoadingCompat(false);
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

  const handleCardPointerEnd = useCallback(() => {
    setIsDraggingCard(false);
    if (!cardSwipeRef.current && cardSwipeX === 0) { return; }
    const threshold = 100;
    if (cardSwipeX > threshold) {
      if (!isLiked) {
        handleLike();
        toast.success("Love To Date! ❤️");
      }
      if (fromDiscover) {
        navigate("/discover", { state: { resumeIndex: discoverIndex + 1 } });
      } else {
        navigate("/discover");
      }
    } else if (cardSwipeX < -threshold) {
      toast("Not for me");
      if (fromDiscover) {
        navigate("/discover", { state: { resumeIndex: discoverIndex + 1 } });
      } else {
        navigate("/discover");
      }
    }
    setCardSwipeX(0);
    cardSwipeRef.current = null;
  }, [cardSwipeX, isLiked, handleLike, fromDiscover, discoverIndex, navigate]);

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
  const formatArray = (val: string | string[] | null) => {
    if (!val) return null;
    if (Array.isArray(val)) return val.map(v => formatEnum(v)).filter(Boolean).join(", ");
    return formatEnum(val);
  };

  if (loading) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div></AppLayout>;
  if (!profile) return <AppLayout><div className="flex h-64 items-center justify-center text-muted-foreground">Profile not found</div></AppLayout>;

  return (
    <AppLayout>
      <div
        className="container mx-auto max-w-3xl px-4 py-6 relative"
        onTouchStart={handlePageTouchStart}
        onTouchMove={handlePageTouchMove}
        onTouchEnd={handlePageTouchEnd}
      >
        {/* Swipe-back edge indicator */}
        {swipeProgress > 0 && (
          <div
            className="fixed left-0 top-0 bottom-0 z-50 flex items-center pointer-events-none"
            style={{ width: `${swipeProgress * 48}px` }}
          >
            <div
              className="ml-1 h-10 w-10 rounded-full bg-gold/80 flex items-center justify-center shadow-lg transition-transform"
              style={{ transform: `scale(${0.5 + swipeProgress * 0.5})`, opacity: swipeProgress }}
            >
              <ArrowLeft className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>
        )}
        {/* Go Back */}
        <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground" onClick={goBackToDiscover}>
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
        {/* Header */}
        <div className="mb-6 flex flex-col items-center">
          <div
            className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-gold/30 mb-4 relative select-none"
            style={{
              transform: cardSwipeX !== 0 ? `translateX(${cardSwipeX}px) rotate(${cardSwipeX * 0.05}deg)` : undefined,
              transition: isDraggingCard ? 'none' : 'transform 0.3s ease',
            }}
            onTouchStart={(e) => { handleCardPointerStart(e.touches[0].clientX, e.touches[0].clientY); setIsDraggingCard(true); }}
            onTouchMove={(e) => {
              handleCardPointerMove(e.touches[0].clientX, e.touches[0].clientY);
              if (cardSwipeLocked.current && cardSwipeRef.current) {
                e.preventDefault();
              }
            }}
            onTouchEnd={() => handleCardPointerEnd()}
            onMouseDown={(e) => { handleCardPointerStart(e.clientX, e.clientY); setIsDraggingCard(true); }}
            onMouseMove={(e) => { if (isDraggingCard) handleCardPointerMove(e.clientX, e.clientY); }}
            onMouseUp={() => handleCardPointerEnd()}
            onMouseLeave={() => { if (isDraggingCard) handleCardPointerEnd(); }}
          >
            {/* Swipe overlay indicators */}
            {cardSwipeX > 50 && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-green-500/20 rounded-2xl pointer-events-none">
                <span className="text-4xl font-bold text-green-500 rotate-[-15deg] border-4 border-green-500 rounded-lg px-4 py-1">LIKE</span>
              </div>
            )}
            {cardSwipeX < -50 && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-destructive/20 rounded-2xl pointer-events-none">
                <span className="text-4xl font-bold text-destructive rotate-[15deg] border-4 border-destructive rounded-lg px-4 py-1">NOPE</span>
              </div>
            )}
            <PhotoCarousel
              avatarUrl={profile.avatar_url}
              photoUrls={profile.photo_urls || []}
              displayName={profile.display_name}
              aspectClass="aspect-[3/4]"
              isVerified={profile.is_verified}
              isSubscribed={profile.is_subscribed}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">Swipe photo right to like, left to pass</p>
          
          {/* Name, age, location & badges */}
          <h1 className="font-serif text-3xl font-bold flex items-center gap-2 text-center flex-wrap justify-center">
            <span>{profile.display_name}{profile.age ? `, ${profile.age}` : ""}</span>
            <span className="flex items-center gap-1 shrink-0">
              {profile.is_verified && <VerifiedBadge size="lg" />}
              {profile.is_subscribed && <SubscriberBadge size="lg" />}
            </span>
          </h1>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            {profile.location_city && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-gold" />{profile.location_city}{profile.location_country ? `, ${profile.location_country}` : ""}</span>}
            {profile.distance_miles !== null && !isOwnProfile && (
              <Badge variant="secondary" className="text-xs font-medium">{profile.distance_miles} miles away</Badge>
            )}
            {profile.nationality && <span className="flex items-center gap-1"><Globe className="h-4 w-4 text-gold" />{profile.nationality}</span>}
          </div>
          {profile.relationship_goal && (Array.isArray(profile.relationship_goal) ? profile.relationship_goal.length > 0 : true) && (
            <Badge variant="outline" className="mt-3 border-gold/30 text-gold">{formatArray(profile.relationship_goal)}</Badge>
          )}

          {/* Non-negotiables — spaced below header */}
          {profile.non_negotiables && profile.non_negotiables.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {profile.non_negotiables.map((item) => {
                const label = item.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                return (
                  <Badge key={item} variant="destructive" className="text-xs px-2.5 py-1">
                    🚫 {label}
                  </Badge>
                );
              })}
            </div>
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
              <Button onClick={() => navigate("/subscription")} className="gradient-gold text-primary-foreground">
                <Lock className="h-4 w-4 mr-2" />
                Unlock
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

        {/* Mutual like indicator + subscription prompt */}
        {!isOwnProfile && isLiked && isLikedBack && (
          <MutualLikePrompt
            profileName={profile.display_name}
            userId={userId!}
            isUnlocked={isUnlocked}
            freeConnectionAvailable={freeConnectionAvailable}
            onConnectionClaimed={() => { setIsUnlocked(true); setFreeConnectionAvailable(false); }}
          />
        )}

        {/* AI Compatibility Score */}
        {!isOwnProfile && (
          <Card className={`mb-4 border-gold/30 bg-card overflow-hidden transition-all duration-500 ${compatScore ? 'shadow-[0_0_20px_hsl(var(--gold)/0.15)]' : ''}`}>
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Sparkles className={`h-5 w-5 text-gold ${compatScore ? 'animate-pulse' : ''}`} />
                AI Compatibility Analysis
                {compatScore && <Badge variant="secondary" className="ml-auto text-[10px]">Advanced AI</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compatScore ? (
                <div className="animate-fade-in space-y-5">
                  {/* Score ring */}
                  <div className="flex items-center gap-5">
                    <div className="relative h-24 w-24 shrink-0">
                      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
                        <circle
                          cx="50" cy="50" r="42" fill="none"
                          stroke="hsl(var(--gold))"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 * (1 - displayedScore / 100)}`}
                          className="transition-all duration-300 ease-out"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gold">
                        {displayedScore}%
                      </span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className={`text-sm font-medium transition-opacity duration-500 ${scoreRevealed ? 'opacity-100' : 'opacity-0'}`}>
                        {compatScore.summary}
                      </p>
                      {compatScore.hasGameData && scoreRevealed && (
                        <div className="flex items-center gap-1.5 animate-fade-in">
                          <Gamepad2 className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-xs font-medium text-purple-500">
                            Game data included {compatScore.gameMatchPercent ? `(${compatScore.gameMatchPercent}% match)` : ''}
                          </span>
                        </div>
                      )}
                      <p className={`text-xs font-medium uppercase tracking-wider transition-opacity duration-700 ${scoreRevealed ? 'opacity-100' : 'opacity-0'} ${
                        displayedScore >= 80 ? 'text-green-600' : displayedScore >= 50 ? 'text-gold' : 'text-muted-foreground'
                      }`}>
                        {displayedScore >= 80 ? '🔥 Excellent Match!' : displayedScore >= 60 ? '✨ Great Potential!' : displayedScore >= 40 ? '💫 Worth Exploring' : '🌱 See Where It Goes'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dimension breakdown */}
                  {scoreRevealed && compatScore.dimensions && (
                    <div className="animate-fade-in space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Compatibility Breakdown</p>
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                          { key: 'values', label: '💫 Values', color: 'bg-purple-500' },
                          { key: 'lifestyle', label: '🏃 Lifestyle', color: 'bg-blue-500' },
                          { key: 'goals', label: '🎯 Goals', color: 'bg-green-500' },
                          { key: 'personality', label: '💭 Vibe', color: 'bg-pink-500' },
                          { key: 'interests', label: '🎮 Fun', color: 'bg-orange-500' },
                        ].map(({ key, label, color }) => {
                          const val = compatScore.dimensions![key as keyof typeof compatScore.dimensions] || 0;
                          return (
                            <div key={key} className="flex flex-col items-center gap-1">
                              <div className="relative h-12 w-12">
                                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                                  <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                                  <circle
                                    cx="18" cy="18" r="14" fill="none"
                                    className={color.replace('bg-', 'stroke-')}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 14}`}
                                    strokeDashoffset={`${2 * Math.PI * 14 * (1 - val / 100)}`}
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{val}</span>
                              </div>
                              <span className="text-[9px] text-muted-foreground leading-tight">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Commonalities */}
                  {scoreRevealed && compatScore.commonalities && compatScore.commonalities.length > 0 && (
                    <div className="animate-fade-in pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">💞 What You Have in Common</p>
                      <div className="flex flex-wrap gap-1.5">
                        {compatScore.commonalities.map((item, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation starters */}
                  {scoreRevealed && compatScore.conversationStarters && compatScore.conversationStarters.length > 0 && (
                    <div className="animate-fade-in pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">💬 AI Conversation Starters</p>
                      <div className="space-y-2">
                        {compatScore.conversationStarters.map((starter, i) => (
                          <p key={i} className="text-sm text-foreground bg-accent/50 rounded-lg px-3 py-2 italic">"{starter}"</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strength & watch-out notes */}
                  {scoreRevealed && (compatScore.strengthsNote || compatScore.watchOutNote) && (
                    <div className="animate-fade-in flex gap-3 pt-2 border-t border-border text-xs">
                      {compatScore.strengthsNote && (
                        <div className="flex-1 bg-green-500/10 rounded-lg p-2">
                          <span className="font-semibold text-green-600">💪 Strength:</span>{' '}
                          <span className="text-muted-foreground">{compatScore.strengthsNote}</span>
                        </div>
                      )}
                      {compatScore.watchOutNote && (
                        <div className="flex-1 bg-amber-500/10 rounded-lg p-2">
                          <span className="font-semibold text-amber-600">👀 Explore:</span>{' '}
                          <span className="text-muted-foreground">{compatScore.watchOutNote}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground text-center">
                    Our advanced AI analyzes 15+ compatibility dimensions including values, lifestyle, goals, and real game data.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-gold/30 text-gold hover:bg-gold/10 hover-scale"
                    onClick={fetchCompatibility}
                    disabled={loadingCompat}
                  >
                    {loadingCompat ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {loadingCompat ? "Deep Analysis..." : "Run AI Compatibility Analysis"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bio */}
        {profile.bio && (
          <Card className="mb-4 border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">About</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.bio}</p></CardContent>
          </Card>
        )}

        {/* Interest Tags */}
        {profile.interests && profile.interests.length > 0 && (
          <Card className="mb-4 border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">About Them</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((tag: string) => (
                  <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-gold/15 text-gold border border-gold/20 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {profile.prompts && profile.prompts.length > 0 && (
          <ProfilePromptDisplay prompts={profile.prompts} />
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
              {(profile as any).diet && (
                <div className="flex items-center gap-3 text-sm"><UtensilsCrossed className="h-4 w-4 text-gold shrink-0" /><span>Diet: {formatEnum((profile as any).diet)}</span></div>
              )}
              {profile.gender && (
                <div className="flex items-center gap-3 text-sm"><UserIcon className="h-4 w-4 text-gold shrink-0" /><span>{formatEnum(profile.gender)}</span></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* In a Nutshell */}
        {(profile.political_beliefs || profile.favourite_music || profile.favourite_film || profile.favourite_sport || profile.favourite_hobbies || profile.personality_type) && (
          <Card className="mb-4 border-border bg-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <img src={acornLogo} alt="Acorn" className="h-6 w-6 rounded-full object-cover" />
                In a Nutshell
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {profile.political_beliefs && (
                  <div className="flex items-center gap-3 text-sm"><Vote className="h-4 w-4 text-gold shrink-0" /><span>Politics: {formatEnum(profile.political_beliefs)}</span></div>
                )}
                {profile.favourite_music && (Array.isArray(profile.favourite_music) ? profile.favourite_music.length > 0 : true) && (
                  <div className="flex items-center gap-3 text-sm"><Music className="h-4 w-4 text-gold shrink-0" /><span>Music: {formatArray(profile.favourite_music)}</span></div>
                )}
                {profile.favourite_film && (Array.isArray(profile.favourite_film) ? profile.favourite_film.length > 0 : true) && (
                  <div className="flex items-center gap-3 text-sm"><Film className="h-4 w-4 text-gold shrink-0" /><span>Film: {formatArray(profile.favourite_film)}</span></div>
                )}
                {profile.favourite_sport && (Array.isArray(profile.favourite_sport) ? profile.favourite_sport.length > 0 : true) && (
                  <div className="flex items-center gap-3 text-sm"><Dumbbell className="h-4 w-4 text-gold shrink-0" /><span>Sport: {formatArray(profile.favourite_sport)}</span></div>
                )}
                {profile.favourite_hobbies && (Array.isArray(profile.favourite_hobbies) ? profile.favourite_hobbies.length > 0 : true) && (
                  <div className="flex items-center gap-3 text-sm"><Gamepad2 className="h-4 w-4 text-gold shrink-0" /><span>Hobbies: {formatArray(profile.favourite_hobbies)}</span></div>
                )}
                {profile.personality_type && (
                  <div className="flex items-center gap-3 text-sm"><Brain className="h-4 w-4 text-gold shrink-0" /><span>Personality: {profile.personality_type}</span></div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Non-Negotiables */}
        {profile.non_negotiables && profile.non_negotiables.length > 0 && (
          <Card className="mb-4 border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg flex items-center gap-2"><Ban className="h-5 w-5 text-destructive" />Non-Negotiables</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.non_negotiables.map((item) => (
                  <Badge key={item} variant="destructive" className="text-xs">
                    {item.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Love To Date / Not For Me buttons */}
        {!isOwnProfile && (
          <div className="mb-6 flex justify-center gap-4">
            <Button
              variant="outline"
              className="flex-1 max-w-[200px] gap-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                toast("Not for me");
                if (fromDiscover) {
                  navigate("/discover", { state: { resumeIndex: discoverIndex + 1 } });
                } else {
                  navigate("/discover");
                }
              }}
            >
              <ThumbsDown className="h-5 w-5" />
              Not For Me
            </Button>
            <Button
              className="flex-1 max-w-[200px] gap-2 gradient-gold text-primary-foreground"
              onClick={() => {
                handleLike();
                toast.success("Love To Date! ❤️");
                if (fromDiscover) {
                  navigate("/discover", { state: { resumeIndex: discoverIndex + 1 } });
                } else {
                  navigate("/discover");
                }
              }}
              disabled={isLiked}
            >
              <Heart className="h-5 w-5" />
              {isLiked ? "Already Liked" : "Love To Date"}
            </Button>
          </div>
        )}

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
