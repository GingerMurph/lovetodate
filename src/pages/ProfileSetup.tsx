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
import { toast } from "sonner";
import { Camera } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const NATIONALITIES = ["British", "Irish", "American", "Canadian", "Australian", "French", "German", "Italian", "Spanish", "Portuguese", "Polish", "Romanian", "Indian", "Pakistani", "Chinese", "Japanese", "Korean", "Brazilian", "Nigerian", "South African", "Other"];

const ProfileSetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
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
        });
        if (data.avatar_url) {
          // Generate signed URL for preview
          const { data: signedData } = await supabase.storage
            .from("profile-photos")
            .createSignedUrl(data.avatar_url.includes("/object/public/") 
              ? data.avatar_url.split("/object/public/profile-photos/")[1] 
              : data.avatar_url, 3600);
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
      let avatar_url = avatarPreview;

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
        avatar_url,
      }).eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated!");
      navigate("/discover");
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
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
              <label htmlFor="avatar" className="group cursor-pointer">
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
              </label>
              <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <p className="mt-3 text-sm text-muted-foreground">Click to upload your photo</p>
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
      </div>
    </AppLayout>
  );
};

export default ProfileSetup;
