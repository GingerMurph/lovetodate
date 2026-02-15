import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Phone, Volume2 } from "lucide-react";
import { toast } from "sonner";

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

const isValidPhoneNumber = (phone: string): boolean => {
  return E164_REGEX.test(phone.replace(/\s/g, ""));
};

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({
    in_app_sound: true,
    email_notifications: true,
    sms_notifications: false,
    phone_number: "",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPrefs({
            in_app_sound: data.in_app_sound,
            email_notifications: data.email_notifications,
            sms_notifications: data.sms_notifications,
            phone_number: data.phone_number || "",
          });
        }
        setLoaded(true);
      });
  }, [user]);

  const savePrefs = async (updated: typeof prefs) => {
    if (!user) return;

    // Validate phone number if SMS is enabled and a number is provided
    if (updated.sms_notifications && updated.phone_number) {
      const cleaned = updated.phone_number.replace(/\s/g, "");
      if (!isValidPhoneNumber(cleaned)) {
        toast.error("Please enter a valid phone number in international format (e.g. +447700900000)");
        return;
      }
      updated = { ...updated, phone_number: cleaned };
    }

    setPrefs(updated);

    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        {
          user_id: user.id,
          ...updated,
          phone_number: updated.phone_number || null,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Preferences saved");
    }
  };

  if (!loaded) return null;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-gold" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="sound" className="cursor-pointer">In-app sound alerts</Label>
          </div>
          <Switch
            id="sound"
            checked={prefs.in_app_sound}
            onCheckedChange={(v) => savePrefs({ ...prefs, in_app_sound: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="email" className="cursor-pointer">Email notifications</Label>
          </div>
          <Switch
            id="email"
            checked={prefs.email_notifications}
            onCheckedChange={(v) => savePrefs({ ...prefs, email_notifications: v })}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms" className="cursor-pointer">SMS notifications</Label>
            </div>
            <Switch
              id="sms"
              checked={prefs.sms_notifications}
              onCheckedChange={(v) => savePrefs({ ...prefs, sms_notifications: v })}
            />
          </div>
          {prefs.sms_notifications && (
            <Input
              placeholder="+44 7700 900000"
              value={prefs.phone_number}
              onChange={(e) => setPrefs({ ...prefs, phone_number: e.target.value })}
              onBlur={() => savePrefs(prefs)}
              className="ml-7"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
