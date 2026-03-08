import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, Ruler, Filter, X, ThumbsDown, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VerifiedBadge from "@/components/VerifiedBadge";
import SubscriberBadge from "@/components/SubscriberBadge";
import { AvatarImage } from "@/components/AvatarImage";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SwipeCard from "@/components/SwipeCard";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import ProfilePromptDisplay from "@/components/ProfilePromptDisplay";

const NATIONALITIES = ["British", "Irish", "American", "Canadian", "Australian", "French", "German", "Italian", "Spanish", "Portuguese", "Polish", "Romanian", "Indian", "Pakistani", "Chinese", "Japanese", "Korean", "Brazilian", "Nigerian", "South African", "European", "African", "Asian", "South American", "Middle Eastern"];
const RELIGIONS = ["Christianity", "Islam", "Hinduism", "Buddhism", "Judaism", "Sikhism", "Spiritual", "Agnostic", "Atheist", "Prefer not to say"];
const PERSONALITY_TYPES = ["Introvert", "Extrovert", "Ambivert", "Old Soul", "Free Spirit", "Adventurer", "Empath", "Creative", "Analytical"];
const DISTANCE_OPTIONS = [
  { label: "Within 5 miles", value: "5" },
  { label: "Within 10 miles", value: "10" },
  { label: "Within 25 miles", value: "25" },
  { label: "Within 50 miles", value: "50" },
  { label: "Within 100 miles", value: "100" },
  { label: "Anywhere", value: "" },
];

type DiscoverProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  photo_urls: string[];
  gender: string | null;
  body_build: string | null;
  height_cm: number | null;
  location_city: string | null;
  nationality: string | null;
  age: number | null;
  religion: string | null;
  smoking: string | null;
  drinking: string | null;
  personality_type: string | null;
  distance_miles: number | null;
  max_distance_miles: number | null;
  too_far: boolean;
  is_verified: boolean;
  is_subscribed: boolean;
  non_negotiables: string[];
  prompts?: { prompt_text: string; answer_text: string }[];
};

const Discover = () => {
  const { user } = useAuth();
  const location = useLocation();
  const resumeIndex = (location.state as any)?.resumeIndex;
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(resumeIndex ?? 0);
  const [history, setHistory] = useState<number[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [filters, setFilters] = useState({
    gender: "",
    body_build: "",
    nationality: "",
    minHeight: "",
    maxHeight: "",
    distance: "",
    religion: "",
    smoking: "",
    drinking: "",
    personality_type: "",
    minAge: "",
    maxAge: "",
  });

  // Get user GPS on mount — sent to edge function for server-side distance, never used client-side
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => { /* denied */ }
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, myLocation]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [discoverRes, likesRes] = await Promise.all([
      supabase.functions.invoke("discover-profiles", {
        body: myLocation ? { lat: myLocation.lat, lng: myLocation.lng } : {},
      }),
      supabase.from("likes").select("liked_id").eq("liker_id", user.id),
    ]);

    if (discoverRes.data && !discoverRes.error) setProfiles(discoverRes.data as DiscoverProfile[]);
    if (likesRes.data) setLikedIds(new Set(likesRes.data.map((l) => l.liked_id)));
    setHistory([]);
    setLoading(false);
  };

  const handleLike = async (targetUserId: string) => {
    if (!user) return;
    const profile = filtered.find(p => p.user_id === targetUserId);
    if (profile?.too_far) {
      toast.error("Sorry but you live too far away!");
      return;
    }
    if (!likedIds.has(targetUserId)) {
      const { error } = await supabase.from("likes").insert({ liker_id: user.id, liked_id: targetUserId });
      if (error) { toast.error(error.message); return; }
      setLikedIds((prev) => new Set(prev).add(targetUserId));
      toast.success("Liked!");
    }
  };

  const handlePass = () => {
    toast("Passed");
  };

  const filtered = profiles.filter((p) => {
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.body_build && p.body_build !== filters.body_build) return false;
    if (filters.nationality && p.nationality !== filters.nationality) return false;
    if (filters.minHeight && p.height_cm && p.height_cm < parseInt(filters.minHeight)) return false;
    if (filters.maxHeight && p.height_cm && p.height_cm > parseInt(filters.maxHeight)) return false;
    if (filters.religion && p.religion !== filters.religion) return false;
    if (filters.smoking && p.smoking !== filters.smoking) return false;
    if (filters.drinking && p.drinking !== filters.drinking) return false;
    if (filters.personality_type && p.personality_type !== filters.personality_type) return false;
    if (filters.minAge && p.age !== null && p.age < parseInt(filters.minAge)) return false;
    if (filters.maxAge && p.age !== null && p.age > parseInt(filters.maxAge)) return false;
    if (filters.distance) {
      if (p.distance_miles === null || p.distance_miles > parseInt(filters.distance)) return false;
    }
    return true;
  });

  const currentProfile = filtered[currentIndex];

  const advanceCard = () => {
    setHistory((prev) => [...prev, currentIndex]);
    setCurrentIndex((prev) => prev + 1);
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const prevIndex = history[history.length - 1];
    const prevProfile = filtered[prevIndex];
    // Remove the like if it was a right-swipe (user liked them)
    if (prevProfile && user && likedIds.has(prevProfile.user_id)) {
      await supabase.from("likes").delete().eq("liker_id", user.id).eq("liked_id", prevProfile.user_id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(prevProfile.user_id);
        return next;
      });
    }
    setHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(prevIndex);
    toast("Went back to previous profile");
  };

  const currentDistance = currentProfile?.distance_miles ?? null;


  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-serif text-2xl font-bold">
            Discover <span className="text-gold">People</span>
          </h1>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            {showFilters ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            Filters
          </Button>
        </div>

        {showFilters && (
          <Card className="mb-6 border-border bg-card">
            <CardContent className="grid gap-3 pt-4 grid-cols-2 md:grid-cols-4">
              <Select value={filters.gender} onValueChange={(v) => setFilters(f => ({ ...f, gender: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="transgender_male">Transgender Male</SelectItem>
                  <SelectItem value="transgender_female">Transgender Female</SelectItem>
                  <SelectItem value="non_binary">Non-Binary</SelectItem>
                  <SelectItem value="genderfluid">Genderfluid</SelectItem>
                  <SelectItem value="genderqueer">Genderqueer</SelectItem>
                  <SelectItem value="agender">Agender</SelectItem>
                  <SelectItem value="two_spirit">Two-Spirit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.body_build} onValueChange={(v) => setFilters(f => ({ ...f, body_build: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Build" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Builds</SelectItem>
                  <SelectItem value="slim">Slim</SelectItem>
                  <SelectItem value="athletic">Athletic</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="curvy">Curvy</SelectItem>
                  <SelectItem value="muscular">Muscular</SelectItem>
                  <SelectItem value="heavyset">Heavyset</SelectItem>
                  <SelectItem value="petite">Petite</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.nationality} onValueChange={(v) => setFilters(f => ({ ...f, nationality: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nationality" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Nationalities</SelectItem>
                  {NATIONALITIES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.distance} onValueChange={(v) => setFilters(f => ({ ...f, distance: v === "anywhere" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Distance from me" /></SelectTrigger>
                <SelectContent>
                  {DISTANCE_OPTIONS.map((d) => (
                    <SelectItem key={d.value || "anywhere"} value={d.value || "anywhere"}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Min Height (cm)" type="number" value={filters.minHeight} onChange={(e) => setFilters(f => ({ ...f, minHeight: e.target.value }))} />
              <Input placeholder="Max Height (cm)" type="number" value={filters.maxHeight} onChange={(e) => setFilters(f => ({ ...f, maxHeight: e.target.value }))} />
              <Input placeholder="Min Age" type="number" value={filters.minAge} onChange={(e) => setFilters(f => ({ ...f, minAge: e.target.value }))} />
              <Input placeholder="Max Age" type="number" value={filters.maxAge} onChange={(e) => setFilters(f => ({ ...f, maxAge: e.target.value }))} />
              <Select value={filters.religion} onValueChange={(v) => setFilters(f => ({ ...f, religion: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Religion" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Religions</SelectItem>
                  {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.smoking} onValueChange={(v) => setFilters(f => ({ ...f, smoking: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Smoking" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="non_smoker">Non-Smoker</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vaper">Vaper</SelectItem>
                  <SelectItem value="trying_to_quit">Trying to Quit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.drinking} onValueChange={(v) => setFilters(f => ({ ...f, drinking: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Drinking" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="non_drinker">Non-Drinker</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.personality_type} onValueChange={(v) => setFilters(f => ({ ...f, personality_type: v === "all" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Personality" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PERSONALITY_TYPES.map((pt) => <SelectItem key={pt} value={pt}>{pt}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">Loading profiles...</div>
        ) : !currentProfile ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
            <p>No more profiles to discover</p>
            <Button variant="outline" onClick={() => { setCurrentIndex(0); loadData(); }}>Refresh</Button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-full max-w-sm">
              {currentProfile && (
                <SwipeCard
                  key={`${currentProfile.user_id}-${currentIndex}`}
                  onSwipeRight={() => {
                    if (currentProfile.too_far) {
                      toast.error("Sorry but you live too far away!");
                    } else {
                      handleLike(currentProfile.user_id);
                    }
                    advanceCard();
                  }}
                  onSwipeLeft={() => { handlePass(); advanceCard(); }}
                >
                  <Card className="overflow-hidden border-border bg-card">
                    <Link to={`/profile/${currentProfile.user_id}`} state={{ fromDiscover: true, discoverIndex: currentIndex }}>
                      <div className="relative">
                        <PhotoCarousel
                          avatarUrl={currentProfile.avatar_url}
                          photoUrls={currentProfile.photo_urls || []}
                          displayName={currentProfile.display_name}
                          isVerified={currentProfile.is_verified}
                          isSubscribed={currentProfile.is_subscribed}
                        />
                        {/* Non-negotiables overlay on photo */}
                        {currentProfile.non_negotiables && currentProfile.non_negotiables.length > 0 && (
                          <div className="absolute top-16 sm:top-8 right-2 z-10 flex flex-col gap-1 pointer-events-none">
                            <TooltipProvider delayDuration={0}>
                              {currentProfile.non_negotiables.map((item) => {
                                const label = item.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                                return (
                                  <Tooltip key={item}>
                                    <TooltipTrigger asChild>
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 pointer-events-auto cursor-pointer backdrop-blur-sm bg-destructive/90 shadow-sm">
                                        🚫 {label}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-[200px] text-center animate-scale-in">
                                      <p className="text-xs">{currentProfile.display_name} won't date someone who is: <strong>{label}</strong></p>
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </TooltipProvider>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-x-0 bottom-12 bg-gradient-to-t from-background/90 to-transparent p-4 pt-16 pointer-events-none">
                        <h3 className="font-serif text-xl font-semibold text-foreground flex items-center gap-1.5">
                          {currentProfile.display_name}{currentProfile.age ? `, ${currentProfile.age}` : ""}
                          {currentProfile.is_verified && <VerifiedBadge size="md" />}
                          {currentProfile.is_subscribed && <SubscriberBadge size="md" />}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {currentProfile.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{currentProfile.location_city}</span>}
                          {currentDistance !== null && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{Math.round(currentDistance)} mi away</span>}
                          {currentProfile.height_cm && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{currentProfile.height_cm}cm</span>}
                          {currentProfile.body_build && <span className="capitalize">{currentProfile.body_build}</span>}
                          {currentProfile.nationality && <span>{currentProfile.nationality}</span>}
                        </div>
                      </div>
                    </Link>
                    <CardContent className="p-3 space-y-2">
                      {currentProfile.prompts && currentProfile.prompts.length > 0 && (
                        <ProfilePromptDisplay prompts={currentProfile.prompts} compact />
                      )}
                      <span className="text-xs text-muted-foreground truncate block">{currentProfile.gender ? currentProfile.gender : "No details yet"}</span>
                    </CardContent>
                  </Card>
                </SwipeCard>
              )}
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center gap-6">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full border-2 border-muted-foreground text-muted-foreground hover:bg-muted disabled:opacity-30"
                onClick={handleUndo}
                disabled={history.length === 0}
                title="Go back"
              >
                <Undo2 className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => { handlePass(); advanceCard(); }}
              >
                <ThumbsDown className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-14 w-14 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                onClick={() => {
                  if (currentProfile.too_far) {
                    toast.error("Sorry but you live too far away!");
                    advanceCard();
                  } else {
                    handleLike(currentProfile.user_id);
                    advanceCard();
                  }
                }}
              >
                <Heart className="h-6 w-6" />
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">Swipe right to like, left to pass</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
