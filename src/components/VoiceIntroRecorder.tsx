import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";

interface VoiceIntroRecorderProps {
  userId: string;
  existingUrl: string | null;
  onSaved: (path: string | null) => void;
}

const MAX_DURATION = 30; // seconds

const VoiceIntroRecorder = ({ userId, existingUrl, onSaved }: VoiceIntroRecorderProps) => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hasExisting, setHasExisting] = useState(!!existingUrl);
  const [signedExistingUrl, setSignedExistingUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sign existing URL for playback
  useEffect(() => {
    if (!existingUrl) return;
    const signUrl = async () => {
      const path = existingUrl.includes("/") ? existingUrl : existingUrl;
      const { data } = await supabase.storage.from("voice-intros").createSignedUrl(path, 3600);
      if (data?.signedUrl) setSignedExistingUrl(data.signedUrl);
    };
    signUrl();
  }, [existingUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setElapsed(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      mediaRecorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_DURATION - 1) {
            mediaRecorder.stop();
            setRecording(false);
            return MAX_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast.error("Microphone access is required to record a voice intro.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const togglePlayback = () => {
    const url = audioUrl || signedExistingUrl;
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlaying(false);
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const handleSave = async () => {
    if (!audioBlob) return;
    setSaving(true);
    try {
      const path = `${userId}/voice_intro.webm`;
      const { error: uploadError } = await supabase.storage
        .from("voice-intros")
        .upload(path, audioBlob, { upsert: true, contentType: "audio/webm" });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ voice_intro_url: path } as any)
        .eq("user_id", userId);
      if (updateError) throw updateError;

      setHasExisting(true);
      onSaved(path);
      toast.success("Voice intro saved! 🎙️");
    } catch (err: any) {
      console.error("Voice intro save error:", err);
      toast.error("Failed to save voice intro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const path = `${userId}/voice_intro.webm`;
      await supabase.storage.from("voice-intros").remove([path]);
      await supabase
        .from("profiles")
        .update({ voice_intro_url: null } as any)
        .eq("user_id", userId);

      setAudioBlob(null);
      setAudioUrl(null);
      setHasExisting(false);
      setSignedExistingUrl(null);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(false);
      onSaved(null);
      toast.success("Voice intro removed");
    } catch (err: any) {
      console.error("Voice intro delete error:", err);
      toast.error("Failed to delete voice intro");
    } finally {
      setDeleting(false);
    }
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setElapsed(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(false);
  };

  const hasPlayableAudio = audioUrl || signedExistingUrl;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Record a short intro (up to {MAX_DURATION}s) so matches can hear your voice before messaging.
      </p>

      {/* Recording controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {!recording && !audioUrl && (
          <Button type="button" variant="outline" size="sm" onClick={startRecording} className="gap-2">
            <Mic className="h-4 w-4 text-destructive" />
            {hasExisting ? "Re-record" : "Record"}
          </Button>
        )}

        {recording && (
          <>
            <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className="gap-2">
              <Square className="h-3 w-3 fill-current" />
              Stop
            </Button>
            <span className="text-sm font-mono text-muted-foreground tabular-nums">
              {elapsed}s / {MAX_DURATION}s
            </span>
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
          </>
        )}

        {hasPlayableAudio && !recording && (
          <Button type="button" variant="ghost" size="sm" onClick={togglePlayback} className="gap-2">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Pause" : "Play"}
          </Button>
        )}

        {audioUrl && !recording && (
          <>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="gap-2 gradient-gold text-primary-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={discardRecording}>
              Discard
            </Button>
          </>
        )}

        {hasExisting && !audioUrl && !recording && (
          <Button type="button" variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
};

export default VoiceIntroRecorder;
