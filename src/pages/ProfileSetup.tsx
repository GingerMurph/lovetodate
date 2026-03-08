import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import acornLogo from "@/assets/logo.png";
import NotificationPreferences from "@/components/NotificationPreferences";
import ShowTheRealYou from "@/components/ShowTheRealYou";

const NATIONALITIES = ["British", "Irish", "American", "Canadian", "Australian", "French", "German", "Italian", "Spanish", "Portuguese", "Polish", "Romanian", "Indian", "Pakistani", "Chinese", "Japanese", "Korean", "Brazilian", "Nigerian", "South African", "Other"];

const RELIGIONS = ["Christianity", "Islam", "Hinduism", "Buddhism", "Judaism", "Sikhism", "Spiritual", "Agnostic", "Atheist", "Prefer not to say", "Other"];
const ETHNICITIES = ["White", "Black", "Asian", "Hispanic/Latino", "Middle Eastern", "Mixed", "Prefer not to say", "Other"];
const LANGUAGES = ["English", "French", "Spanish", "German", "Italian", "Portuguese", "Polish", "Romanian", "Arabic", "Hindi", "Urdu", "Chinese", "Japanese", "Korean", "Turkish", "Russian", "Dutch", "Swedish", "Other"];
const PETS_OPTIONS = ["Dog(s)", "Cat(s)", "Both", "Other pets", "None", "Want pets"];

const COUNTRIES = ["United Kingdom", "Ireland", "United States", "Canada", "Australia", "France", "Germany", "Italy", "Spain", "Portugal", "Poland", "Romania", "India", "Pakistan", "China", "Japan", "South Korea", "Brazil", "Nigeria", "South Africa", "Other"];
const OCCUPATIONS = ["Student", "Teacher", "Engineer", "Doctor", "Nurse", "Lawyer", "Accountant", "Designer", "Developer", "Manager", "Entrepreneur", "Freelancer", "Artist", "Writer", "Chef", "Retail", "Finance", "Marketing", "Sales", "HR", "Consultant", "Scientist", "Researcher", "Civil Servant", "Military", "Retired", "Other"];
const EDUCATION_LEVELS = ["Secondary School", "College", "Undergraduate Degree", "Postgraduate Degree", "Master's Degree", "PhD / Doctorate", "Professional Qualification", "Self-taught", "Prefer not to say", "Other"];
const MUSIC_GENRES = ["Pop", "Rock", "Hip-Hop", "R&B", "Jazz", "Classical", "Country", "Electronic", "House", "Chillout", "Drum & Bass", "Indie", "Reggae", "Latin", "Metal", "Folk", "Soul", "Blues", "Punk", "Afrobeats", "K-Pop", "Other"];
const CITIES = ["London", "Manchester", "Birmingham", "Leeds", "Liverpool", "Bristol", "Sheffield", "Newcastle", "Nottingham", "Glasgow", "Edinburgh", "Cardiff", "Belfast", "Dublin", "Brighton", "Southampton", "Leicester", "Coventry", "Oxford", "Cambridge", "York", "Bath", "Reading", "Aberdeen", "Dundee", "Swansea", "Plymouth", "Exeter", "Norwich", "Bournemouth", "Wolverhampton", "Derby", "Stoke-on-Trent", "Sunderland", "Portsmouth", "Preston", "Blackpool", "Milton Keynes", "Luton", "Ipswich", "Other"];
const FILM_GENRES = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance", "Thriller", "Documentary", "Animation", "Fantasy", "Musical", "Crime", "Western", "Indie", "Other"];
const SPORTS = ["Football", "Rugby", "Cricket", "Tennis", "Basketball", "Swimming", "Running", "Cycling", "Boxing", "Golf", "Yoga", "Gym / Weightlifting", "Martial Arts", "Hiking", "Dancing", "None", "Other"];
const HOBBIES = ["Reading", "Cooking", "Travelling", "Photography", "Gaming", "Music", "Art", "Writing", "Gardening", "DIY", "Volunteering", "Fitness", "Movies & TV", "Board Games", "Socialising", "Shopping", "Other"];
const PERSONALITY_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP", "Introvert", "Extrovert", "Ambivert", "Don't know"];

const ProfileSetup = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [storedPhotoPaths, setStoredPhotoPaths] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [isPaused, setIsPaused] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bioSuggestions, setBioSuggestions] = useState<string[]>([]);
  const [loadingBio, setLoadingBio] = useState(false);
  const [bioTone, setBioTone] = useState("sincere");
  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    gender: "" as string,
    looking_for: "everyone" as string,
    relationship_goal: [] as string[],
    bio: "",
    height_cm: "",
    weight_kg: "",
    body_build: "" as string,
    nationality: "",
    location_city: "",
    location_country: "",
    occupation: "",
    education: "",
    smoking: "",
    drinking: "",
    children: "",
    religion: "",
    ethnicity: "",
    languages: [] as string[],
    pets: "",
    political_beliefs: "",
    favourite_music: [] as string[],
    favourite_film: [] as string[],
    favourite_sport: [] as string[],
    favourite_hobbies: [] as string[],
    personality_type: "",
    max_distance_miles: "",
    non_negotiables: [] as string[],
  });

  // Capture GPS location
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (user) {
            supabase.from("profiles").update({ latitude, longitude } as any).eq("user_id", user.id).then();
          }
        },
        () => { /* user denied or unavailable, no-op */ }
      );
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const [{ data }, { data: privateData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("profile_private_data" as any).select("date_of_birth").eq("user_id", user.id).maybeSingle(),
      ]);
      if (data) {
        setForm({
          display_name: data.display_name || "",
          date_of_birth: (privateData as any)?.date_of_birth || data.date_of_birth || "",
          gender: data.gender || "",
          looking_for: data.looking_for || "everyone",
          relationship_goal: (data.relationship_goal as string[] | null) || [],
          bio: data.bio || "",
          height_cm: data.height_cm?.toString() || "",
          weight_kg: data.weight_kg?.toString() || "",
          body_build: data.body_build || "",
          nationality: data.nationality || "",
          location_city: data.location_city || "",
          location_country: data.location_country || "",
          occupation: data.occupation || "",
          education: data.education || "",
          smoking: data.smoking || "",
          drinking: data.drinking || "",
          children: data.children || "",
          religion: (data as any).religion || "",
          ethnicity: (data as any).ethnicity || "",
          languages: (data as any).languages || [],
          pets: (data as any).pets || "",
          political_beliefs: (data as any).political_beliefs || "",
          favourite_music: (data as any).favourite_music || [],
          favourite_film: (data as any).favourite_film || [],
          favourite_sport: (data as any).favourite_sport || [],
          favourite_hobbies: (data as any).favourite_hobbies || [],
          personality_type: (data as any).personality_type || "",
          max_distance_miles: (data as any).max_distance_miles?.toString() || "",
          non_negotiables: (data as any).non_negotiables || [],
        });
        setIsPaused(data.is_paused || false);

        // Load all photos: avatar_url is photo 0, photo_urls has photos 1-5
        const allPaths: (string | null)[] = [null, null, null, null, null, null];
        const extraPhotos: string[] = (data as any).photo_urls || [];
        
        if (data.avatar_url) {
          let path = data.avatar_url;
          if (path.includes("/object/public/profile-photos/")) {
            path = path.split("/object/public/profile-photos/")[1];
          } else if (path.includes("/object/sign/profile-photos/")) {
            path = path.split("/object/sign/profile-photos/")[1];
            path = path.split("?")[0];
          }
          allPaths[0] = path;
        }
        extraPhotos.forEach((p, i) => { if (i < 5) allPaths[i + 1] = p; });
        setStoredPhotoPaths(allPaths);

        // Sign all stored paths
        const previews: (string | null)[] = [null, null, null, null, null, null];
        await Promise.all(allPaths.map(async (p, i) => {
          if (p) {
            const { data: signedData } = await supabase.storage
              .from("profile-photos")
              .createSignedUrl(p, 3600);
            if (signedData?.signedUrl) previews[i] = signedData.signedUrl;
          }
        }));
        setPhotoPreviews(previews);
      }
    };
    loadProfile();
  }, [user]);

  const handlePhotoChange = (index: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFiles(prev => { const n = [...prev]; n[index] = file; return n; });
      setPhotoPreviews(prev => { const n = [...prev]; n[index] = URL.createObjectURL(file); return n; });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(prev => { const n = [...prev]; n[index] = null; return n; });
    setPhotoPreviews(prev => { const n = [...prev]; n[index] = null; return n; });
    setStoredPhotoPaths(prev => { const n = [...prev]; n[index] = null; return n; });
  };

  const handleGenerateBio = async () => {
    if (loadingBio) return;
    setLoadingBio(true);
    setBioSuggestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-bio", {
        body: { tone: bioTone },
      });
      if (error) throw error;
      if (data?.bios?.length) {
        setBioSuggestions(data.bios);
      } else {
        toast.error("Couldn't generate bios. Try again!");
      }
    } catch (err: any) {
      console.error("Bio generation error:", err);
      toast.error("Failed to generate bio suggestions");
    } finally {
      setLoadingBio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Upload all photos
      const finalPaths = [...storedPhotoPaths];
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      await Promise.all(photoFiles.map(async (file, i) => {
        if (file) {
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, WebP, and GIF are allowed.`);
          }
          if (file.size > maxSize) {
            throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`);
          }
          const ext = file.name.split(".").pop();
          const path = `${user.id}/photo_${i}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true });
          if (uploadError) throw uploadError;
          finalPaths[i] = path;
        }
      }));

      const avatar_url = finalPaths[0];
      const photo_urls = finalPaths.slice(1).filter(Boolean) as string[];

      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name,
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as any,
        looking_for: (form.looking_for || null) as any,
        relationship_goal: (form.relationship_goal.length > 0 ? form.relationship_goal : null) as any,
        bio: form.bio,
        height_cm: form.height_cm ? parseInt(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseInt(form.weight_kg) : null,
        body_build: (form.body_build || null) as any,
        nationality: form.nationality,
        location_city: form.location_city,
        location_country: form.location_country,
        occupation: form.occupation,
        education: form.education,
        smoking: form.smoking,
        drinking: form.drinking,
        children: form.children,
        religion: form.religion,
        ethnicity: form.ethnicity,
        languages: form.languages,
        pets: form.pets,
        political_beliefs: form.political_beliefs,
        favourite_music: form.favourite_music,
        favourite_film: form.favourite_film,
        favourite_sport: form.favourite_sport,
        favourite_hobbies: form.favourite_hobbies,
        personality_type: form.personality_type,
        max_distance_miles: form.max_distance_miles ? parseInt(form.max_distance_miles) : null,
        non_negotiables: form.non_negotiables,
        avatar_url,
        photo_urls,
      } as any).eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated!");
      navigate("/discover");
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const handleTogglePause = async () => {
    if (!user) return;
    setPausing(true);
    const newPaused = !isPaused;
    const { error } = await supabase.from("profiles").update({ is_paused: newPaused } as any).eq("user_id", user.id);
    setPausing(false);
    if (error) {
      toast.error("Failed to update account status");
      return;
    }
    setIsPaused(newPaused);
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

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AppLayout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="relative mb-8">
          <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-serif text-3xl font-bold text-center">
            Complete Your <span className="text-gold">Profile</span>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Photos (up to 6)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="relative">
                    <label htmlFor={`photo-${i}`} className="group cursor-pointer block">
                      <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed border-border bg-secondary flex items-center justify-center hover:border-gold/50 transition-colors">
                        {photoPreviews[i] ? (
                          <img src={photoPreviews[i]!} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">{i === 0 ? "Main" : `#${i + 1}`}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="h-5 w-5 text-gold" />
                        </div>
                      </div>
                    </label>
                    <input id={`photo-${i}`} type="file" accept="image/*" onChange={handlePhotoChange(i)} className="hidden" />
                    {photoPreviews[i] && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(i)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive/80"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">First photo is your main profile picture</p>
              
              {/* Verification CTA */}
              <div className="mt-4 rounded-lg border border-border bg-secondary/50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <>
                      <BadgeCheck className="h-5 w-5 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">ID Verified ✓</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Verify your identity to build trust</span>
                    </>
                  )}
                </div>
                {!isVerified && (
                  <Link to="/verify">
                    <Button size="sm" variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                      Verify Now
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Basic Information</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="transgender_male">Transgender Male</SelectItem>
                    <SelectItem value="transgender_female">Transgender Female</SelectItem>
                    <SelectItem value="non_binary">Non-Binary</SelectItem>
                    <SelectItem value="genderfluid">Genderfluid</SelectItem>
                    <SelectItem value="genderqueer">Genderqueer</SelectItem>
                    <SelectItem value="agender">Agender</SelectItem>
                    <SelectItem value="two_spirit">Two-Spirit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Looking For</Label>
                <Select value={form.looking_for} onValueChange={(v) => update("looking_for", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Men</SelectItem>
                    <SelectItem value="female">Women</SelectItem>
                    <SelectItem value="everyone">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Relationship Goal (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "long_term", label: "Long-term relationship" },
                    { value: "short_term", label: "Short-term relationship" },
                    { value: "casual", label: "Casual dating" },
                    { value: "friendship", label: "Friendship" },
                    { value: "not_sure", label: "Not sure yet" },
                    { value: "free_tonight", label: "I'm Free Tonight! 😉" },
                  ].map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          relationship_goal: f.relationship_goal.includes(goal.value)
                            ? f.relationship_goal.filter((g) => g !== goal.value)
                            : [...f.relationship_goal, goal.value],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        form.relationship_goal.includes(goal.value)
                          ? "bg-gold text-primary-foreground border-gold"
                          : "bg-secondary text-muted-foreground border-border hover:border-gold/50"
                      }`}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Physical */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Physical Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input type="number" min="100" max="250" value={form.height_cm} onChange={(e) => update("height_cm", e.target.value)} placeholder="175" />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input type="number" min="30" max="300" value={form.weight_kg} onChange={(e) => update("weight_kg", e.target.value)} placeholder="70" />
              </div>
              <div className="space-y-2">
                <Label>Body Build</Label>
                <Select value={form.body_build} onValueChange={(v) => update("body_build", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slim">Slim</SelectItem>
                    <SelectItem value="athletic">Athletic</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="curvy">Curvy</SelectItem>
                    <SelectItem value="muscular">Muscular</SelectItem>
                    <SelectItem value="heavyset">Heavyset</SelectItem>
                    <SelectItem value="petite">Petite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Background */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Background & Location</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nationality</Label>
                <Select value={form.nationality} onValueChange={(v) => update("nationality", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {NATIONALITIES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City / Town</Label>
                <Select value={form.location_city} onValueChange={(v) => update("location_city", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select value={form.location_country} onValueChange={(v) => update("location_country", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Select value={form.occupation} onValueChange={(v) => update("occupation", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {OCCUPATIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Education</Label>
                <Select value={form.education} onValueChange={(v) => update("education", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Religion, Ethnicity & Languages */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Identity & Culture</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Religion</Label>
                <Select value={form.religion} onValueChange={(v) => update("religion", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {RELIGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ethnicity</Label>
                <Select value={form.ethnicity} onValueChange={(v) => update("ethnicity", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ETHNICITIES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pets</Label>
                <Select value={form.pets} onValueChange={(v) => update("pets", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {PETS_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Languages Spoken</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          languages: f.languages.includes(lang)
                            ? f.languages.filter((l) => l !== lang)
                            : [...f.languages, lang],
                        }));
                      }}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        form.languages.includes(lang)
                          ? "bg-gold text-primary-foreground border-gold"
                          : "bg-secondary text-muted-foreground border-border hover:border-gold/50"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lifestyle */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">Lifestyle</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Smoking</Label>
                <Select value={form.smoking} onValueChange={(v) => update("smoking", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="social">Socially</SelectItem>
                    <SelectItem value="regular">Regularly</SelectItem>
                    <SelectItem value="vaper">Vaper</SelectItem>
                    <SelectItem value="trying_to_quit">Trying to quit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Drinking</Label>
                <Select value={form.drinking} onValueChange={(v) => update("drinking", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="social">Socially</SelectItem>
                    <SelectItem value="regular">Regularly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Select value={form.children} onValueChange={(v) => update("children", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="have">Have children</SelectItem>
                    <SelectItem value="want">Want children</SelectItem>
                    <SelectItem value="not_sure">Not sure</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* In a Nutshell */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <img src={acornLogo} alt="Acorn" className="h-6 w-6 rounded-full object-cover" />
                In a Nutshell
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Political Beliefs</Label>
                <Select value={form.political_beliefs} onValueChange={(v) => update("political_beliefs", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="labour">Labour</SelectItem>
                    <SelectItem value="liberal">Liberal</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="not_political">Not political</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Favourite Music (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {MUSIC_GENRES.map((m) => (
                    <button key={m} type="button" onClick={() => setForm((f) => ({ ...f, favourite_music: f.favourite_music.includes(m) ? f.favourite_music.filter((x) => x !== m) : [...f.favourite_music, m] }))} className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.favourite_music.includes(m) ? "bg-gold text-primary-foreground border-gold" : "bg-secondary text-muted-foreground border-border hover:border-gold/50"}`}>{m}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Favourite Films (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {FILM_GENRES.map((f) => (
                    <button key={f} type="button" onClick={() => setForm((prev) => ({ ...prev, favourite_film: prev.favourite_film.includes(f) ? prev.favourite_film.filter((x) => x !== f) : [...prev.favourite_film, f] }))} className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.favourite_film.includes(f) ? "bg-gold text-primary-foreground border-gold" : "bg-secondary text-muted-foreground border-border hover:border-gold/50"}`}>{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Favourite Sports (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map((s) => (
                    <button key={s} type="button" onClick={() => setForm((f) => ({ ...f, favourite_sport: f.favourite_sport.includes(s) ? f.favourite_sport.filter((x) => x !== s) : [...f.favourite_sport, s] }))} className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.favourite_sport.includes(s) ? "bg-gold text-primary-foreground border-gold" : "bg-secondary text-muted-foreground border-border hover:border-gold/50"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Favourite Hobbies (select all that apply)</Label>
                <div className="flex flex-wrap gap-2">
                  {HOBBIES.map((h) => (
                    <button key={h} type="button" onClick={() => setForm((f) => ({ ...f, favourite_hobbies: f.favourite_hobbies.includes(h) ? f.favourite_hobbies.filter((x) => x !== h) : [...f.favourite_hobbies, h] }))} className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.favourite_hobbies.includes(h) ? "bg-gold text-primary-foreground border-gold" : "bg-secondary text-muted-foreground border-border hover:border-gold/50"}`}>{h}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Personality Type</Label>
                <Select value={form.personality_type} onValueChange={(v) => update("personality_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {PERSONALITY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Distance Willing to Travel</Label>
                <Select value={form.max_distance_miles} onValueChange={(v) => update("max_distance_miles", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Within 5 miles</SelectItem>
                    <SelectItem value="10">Within 10 miles</SelectItem>
                    <SelectItem value="25">Within 25 miles</SelectItem>
                    <SelectItem value="50">Within 50 miles</SelectItem>
                    <SelectItem value="100">Within 100 miles</SelectItem>
                    <SelectItem value="200">Within 200 miles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Non-Negotiables */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-serif text-lg">🚫 Non-Negotiables</CardTitle>
              <p className="text-xs text-muted-foreground">Select deal-breakers that are shown on your profile photo</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Selected badges */}
              {form.non_negotiables.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.non_negotiables.map((val) => {
                    const label = val.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <span
                        key={val}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs bg-destructive text-destructive-foreground border border-destructive"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, non_negotiables: f.non_negotiables.filter((n) => n !== val) }))}
                          className="ml-0.5 hover:opacity-70"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Dropdown selector */}
              <Select
                value=""
                onValueChange={(val) => {
                  if (!form.non_negotiables.includes(val)) {
                    setForm((f) => ({ ...f, non_negotiables: [...f.non_negotiables, val] }));
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add a deal-breaker..." />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "heavy_drinkers", label: "Heavy Drinkers" },
                    { value: "smokers", label: "Smokers" },
                    { value: "vapers", label: "Vapers" },
                    { value: "drug_takers", label: "Drug Takers" },
                    { value: "unemployed", label: "Unemployed" },
                    { value: "unhealthy_lifestyle", label: "Unhealthy Lifestyle" },
                    { value: "no_ambition", label: "No Ambition" },
                    { value: "dishonesty", label: "Dishonesty" },
                    { value: "poor_hygiene", label: "Poor Hygiene" },
                    { value: "excessive_gambling", label: "Excessive Gambling" },
                    { value: "no_sense_of_humour", label: "No Sense of Humour" },
                    { value: "controlling_behaviour", label: "Controlling Behaviour" },
                    { value: "negativity", label: "Constant Negativity" },
                    { value: "no_kids", label: "Doesn't Want Kids" },
                    { value: "has_kids", label: "Already Has Kids" },
                    { value: "long_distance", label: "Long Distance" },
                  ]
                    .filter((item) => !form.non_negotiables.includes(item.value))
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Show the Real You */}
          <ShowTheRealYou />

          {/* Bio */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">About You</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Tell potential matches about yourself, what makes you unique, what you're looking for..." rows={5} className="resize-none" />
              
              <div className="flex items-center gap-2">
                <Select value={bioTone} onValueChange={setBioTone}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="witty">✨ Witty</SelectItem>
                    <SelectItem value="sincere">💛 Sincere</SelectItem>
                    <SelectItem value="adventurous">🌍 Adventurous</SelectItem>
                    <SelectItem value="chill">😎 Chill</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBio}
                  disabled={loadingBio}
                  className="gap-1.5"
                >
                  {loadingBio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Write my bio
                </Button>
              </div>

              {bioSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Tap to use:</p>
                  {bioSuggestions.map((bio, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { update("bio", bio); setBioSuggestions([]); }}
                      className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent transition-colors"
                    >
                      {bio}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button type="submit" className="w-full gradient-gold text-primary-foreground font-semibold py-6 text-lg" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>

        {/* Notification Preferences */}
        <div className="mt-8">
          <NotificationPreferences />
        </div>

        {/* Account Management */}
        <Card className="mt-6 border-border">
          <CardHeader><CardTitle className="font-serif text-lg">Account Management</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Pause Account */}
            <div>
              <h3 className="text-sm font-medium mb-1">Pause Account</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {isPaused
                  ? "Your account is paused. Your profile is hidden from discovery. Unpause to become visible again."
                  : "Temporarily hide your profile from discovery. Your data will be kept safe."}
              </p>
              <Button
                variant={isPaused ? "default" : "outline"}
                disabled={pausing}
                onClick={handleTogglePause}
              >
                {pausing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isPaused ? "Unpause Account" : "Pause Account"}
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
      </div>
    </AppLayout>
  );
};

export default ProfileSetup;
