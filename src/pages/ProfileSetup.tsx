import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Camera, Loader2, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import NotificationPreferences from "@/components/NotificationPreferences";

const NATIONALITIES = ["British", "Irish", "American", "Canadian", "Australian", "French", "German", "Italian", "Spanish", "Portuguese", "Polish", "Romanian", "Indian", "Pakistani", "Chinese", "Japanese", "Korean", "Brazilian", "Nigerian", "South African", "Other"];

const RELIGIONS = ["Christianity", "Islam", "Hinduism", "Buddhism", "Judaism", "Sikhism", "Spiritual", "Agnostic", "Atheist", "Prefer not to say", "Other"];
const ETHNICITIES = ["White", "Black", "Asian", "Hispanic/Latino", "Middle Eastern", "Mixed", "Prefer not to say", "Other"];
const LANGUAGES = ["English", "French", "Spanish", "German", "Italian", "Portuguese", "Polish", "Romanian", "Arabic", "Hindi", "Urdu", "Chinese", "Japanese", "Korean", "Turkish", "Russian", "Dutch", "Swedish", "Other"];
const PETS_OPTIONS = ["Dog(s)", "Cat(s)", "Both", "Other pets", "None", "Want pets"];

const ProfileSetup = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [storedAvatarPath, setStoredAvatarPath] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    display_name: "",
    date_of_birth: "",
    gender: "" as string,
    looking_for: "everyone" as string,
    relationship_goal: "" as string,
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
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(async ({ data }) => {
      if (data) {
        setForm({
          display_name: data.display_name || "",
          date_of_birth: data.date_of_birth || "",
          gender: data.gender || "",
          looking_for: data.looking_for || "everyone",
          relationship_goal: data.relationship_goal || "",
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
        });
        setIsPaused(data.is_paused || false);

        if (data.avatar_url) {
          // Extract the storage path from any URL format
          let path = data.avatar_url;
          if (path.includes("/object/public/profile-photos/")) {
            path = path.split("/object/public/profile-photos/")[1];
          } else if (path.includes("/object/sign/profile-photos/")) {
            path = path.split("/object/sign/profile-photos/")[1];
            // Remove query params (token etc.)
            path = path.split("?")[0];
          }
          setStoredAvatarPath(path);

          // Generate signed URL for preview
          const { data: signedData } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(path, 3600);
          if (signedData?.signedUrl) setAvatarPreview(signedData.signedUrl);
        }
      }
    });
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // Use stored path by default, only change if new file uploaded
      let avatar_url = storedAvatarPath;

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        avatar_url = path;
      }

      const { error } = await supabase.from("profiles").update({
        display_name: form.display_name,
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as any,
        looking_for: (form.looking_for || null) as any,
        relationship_goal: (form.relationship_goal || null) as any,
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
        avatar_url,
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
        <h1 className="mb-8 font-serif text-3xl font-bold text-center">
          Complete Your <span className="text-gold">Profile</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar */}
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center py-8">
              <label htmlFor="avatar" className="group cursor-pointer flex flex-col items-center">
                <div className="relative h-32 w-32 overflow-hidden rounded-full border-2 border-gold/30 bg-secondary flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-gold" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Click to upload your photo</p>
              </label>
              <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
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
                    <SelectItem value="non_binary">Non-Binary</SelectItem>
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
                <Label>Relationship Goal</Label>
                <Select value={form.relationship_goal} onValueChange={(v) => update("relationship_goal", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long_term">Long-term relationship</SelectItem>
                    <SelectItem value="short_term">Short-term relationship</SelectItem>
                    <SelectItem value="casual">Casual dating</SelectItem>
                    <SelectItem value="friendship">Friendship</SelectItem>
                    <SelectItem value="not_sure">Not sure yet</SelectItem>
                  </SelectContent>
                </Select>
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
                <Label>City</Label>
                <Input value={form.location_city} onChange={(e) => update("location_city", e.target.value)} placeholder="London" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.location_country} onChange={(e) => update("location_country", e.target.value)} placeholder="United Kingdom" />
              </div>
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Teacher" />
              </div>
              <div className="space-y-2">
                <Label>Education</Label>
                <Input value={form.education} onChange={(e) => update("education", e.target.value)} placeholder="e.g. University degree" />
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

          {/* Bio */}
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="font-serif text-lg">About You</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Tell potential matches about yourself, what makes you unique, what you're looking for..." rows={5} className="resize-none" />
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
