import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, MapPin, Ruler, Weight, Filter, X } from "lucide-react";
import { AvatarImage } from "@/components/AvatarImage";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

type DiscoverProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  gender: string | null;
  body_build: string | null;
  height_cm: number | null;
  location_city: string | null;
  nationality: string | null;
  age: number | null;
};

const Discover = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    gender: "",
    body_build: "",
    nationality: "",
    minHeight: "",
    maxHeight: "",
    city: "",
  });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [discoverRes, likesRes] = await Promise.all([
      supabase.functions.invoke("discover-profiles"),
      supabase.from("likes").select("liked_id").eq("liker_id", user.id),
    ]);

    if (discoverRes.data && !discoverRes.error) setProfiles(discoverRes.data as DiscoverProfile[]);
    if (likesRes.data) setLikedIds(new Set(likesRes.data.map((l) => l.liked_id)));
    setLoading(false);
  };

  const handleLike = async (targetUserId: string) => {
    if (!user) return;
    if (likedIds.has(targetUserId)) {
      await supabase.from("likes").delete().eq("liker_id", user.id).eq("liked_id", targetUserId);
      setLikedIds((prev) => { const s = new Set(prev); s.delete(targetUserId); return s; });
      toast("Like removed");
    } else {
      const { error } = await supabase.from("likes").insert({ liker_id: user.id, liked_id: targetUserId });
      if (error) { toast.error(error.message); return; }
      setLikedIds((prev) => new Set(prev).add(targetUserId));
      toast.success("Liked!");
    }
  };

  const filtered = profiles.filter((p) => {
    if (filters.gender && p.gender !== filters.gender) return false;
    if (filters.body_build && p.body_build !== filters.body_build) return false;
    if (filters.nationality && p.nationality !== filters.nationality) return false;
    if (filters.minHeight && p.height_cm && p.height_cm < parseInt(filters.minHeight)) return false;
    if (filters.maxHeight && p.height_cm && p.height_cm > parseInt(filters.maxHeight)) return false;
    if (filters.city && p.location_city && !p.location_city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    return true;
  });

  // Age is now returned directly from the edge function

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
                  <SelectItem value="non_binary">Non-Binary</SelectItem>
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
              <Input placeholder="Nationality" value={filters.nationality} onChange={(e) => setFilters(f => ({ ...f, nationality: e.target.value }))} />
              <Input placeholder="City" value={filters.city} onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))} />
              <Input placeholder="Min Height (cm)" type="number" value={filters.minHeight} onChange={(e) => setFilters(f => ({ ...f, minHeight: e.target.value }))} />
              <Input placeholder="Max Height (cm)" type="number" value={filters.maxHeight} onChange={(e) => setFilters(f => ({ ...f, maxHeight: e.target.value }))} />
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">Loading profiles...</div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">No profiles found</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((profile) => (
              <Card key={profile.user_id} className="group overflow-hidden border-border bg-card transition-all hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5">
                <Link to={`/profile/${profile.user_id}`}>
                  <div className="relative aspect-[3/4] bg-secondary">
                    <AvatarImage avatarUrl={profile.avatar_url} displayName={profile.display_name} />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-4 pt-16">
                      <h3 className="font-serif text-xl font-semibold text-foreground">
                        {profile.display_name}{profile.age ? `, ${profile.age}` : ""}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {profile.location_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location_city}</span>}
                        {profile.height_cm && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{profile.height_cm}cm</span>}
                        {profile.body_build && <span className="capitalize">{profile.body_build}</span>}
                        {profile.nationality && <span>{profile.nationality}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
                <CardContent className="flex items-center justify-between p-3">
                  <span className="text-xs text-muted-foreground truncate max-w-[60%]">{profile.gender ? profile.gender : "No details yet"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.preventDefault(); handleLike(profile.user_id); }}
                    className={likedIds.has(profile.user_id) ? "text-red-500" : "text-muted-foreground"}
                  >
                    <Heart className={`h-5 w-5 ${likedIds.has(profile.user_id) ? "fill-current" : ""}`} />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Discover;
