import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, RefreshCw, CheckCircle, Loader2, ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

const POSES = [
  { instruction: "Give a thumbs up 👍", emoji: "👍" },
  { instruction: "Make a peace sign ✌️", emoji: "✌️" },
  { instruction: "Wave at the camera 👋", emoji: "👋" },
  { instruction: "Point to your nose 👆", emoji: "👆" },
  { instruction: "Show three fingers 🤟", emoji: "🤟" },
];

const Verify = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [pose] = useState(() => POSES[Math.floor(Math.random() * POSES.length)]);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.is_verified) setIsAlreadyVerified(true);
      });
  }, [user]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraReady(true);
      }
    } catch (err: any) {
      setCameraDenied(true);
      toast.error("Camera access denied. Please enable it in your browser settings.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedImage(blob);
          setPreviewUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      },
      "image/jpeg",
      0.85
    );
  };

  const retake = () => {
    setCapturedImage(null);
    setPreviewUrl(null);
    startCamera();
  };

  const submit = async () => {
    if (!user || !capturedImage) return;
    setSubmitting(true);

    try {
      // Upload selfie to storage
      const path = `${user.id}/verification_selfie.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, capturedImage, { upsert: true, contentType: "image/jpeg" });
      if (uploadErr) throw uploadErr;

      // Submit verification via server-side edge function (prevents client-side bypass)
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke("submit-verification", {
        body: { selfie_path: path },
      });
      if (verifyErr) throw verifyErr;
      if (verifyData?.error) throw new Error(verifyData.error);

      toast.success("You're now verified! ✅");
      navigate("/profile");
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    }
    setSubmitting(false);
  };

  if (isAlreadyVerified) {
    return (
      <AppLayout>
        <div className="container mx-auto max-w-md px-4 py-12 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-blue-500 mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Already Verified</h1>
          <p className="text-muted-foreground mb-6">Your identity has been confirmed. You're all set!</p>
          <Button onClick={() => navigate("/discover")} className="gradient-gold text-primary-foreground">
            Back to Discover
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md px-4 py-8">
        {/* Back button */}
        <Button variant="ghost" size="sm" className="mb-4 gap-2 text-muted-foreground" onClick={() => {
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            navigate("/profile");
          }
        }}>
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <h1 className="mb-2 font-serif text-2xl font-bold text-center">
          Verify Your <span className="text-gold">Identity</span>
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Take a selfie doing the pose below to prove you're a real person.
        </p>

        {/* Pose instruction */}
        <Card className="mb-6 border-gold/30 bg-accent/10">
          <CardContent className="flex items-center gap-4 py-4">
            <span className="text-4xl">{pose.emoji}</span>
            <div>
              <p className="font-semibold text-sm">Your pose:</p>
              <p className="text-lg font-bold text-gold">{pose.instruction}</p>
            </div>
          </CardContent>
        </Card>

        {/* Camera / Preview */}
        <Card className="mb-6 border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            {!cameraReady && !previewUrl && (
              <div className="flex flex-col items-center justify-center h-64 gap-4 p-4">
                {cameraDenied ? (
                  <>
                    <Settings className="h-12 w-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      Camera access was denied. Enable camera permissions and try again.
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-[240px]">
                      <Button onClick={() => { setCameraDenied(false); startCamera(); }} className="gradient-gold text-primary-foreground">
                        <Camera className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="app-settings:camera" onClick={(e) => {
                          e.preventDefault();
                          // Browsers don't allow direct links to settings, guide user instead
                          toast.info("Tap the lock icon (🔒) in your browser's address bar → Site settings → Camera → Allow", { duration: 8000 });
                        }}>
                          <Settings className="h-4 w-4 mr-2" />
                          How to enable camera
                        </a>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="h-12 w-12 text-muted-foreground" />
                    <Button onClick={startCamera} className="gradient-gold text-primary-foreground">
                      <Camera className="h-4 w-4 mr-2" />
                      Open Camera
                    </Button>
                  </>
                )}
              </div>
            )}
            {cameraReady && !previewUrl && (
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover mirror"
                  style={{ transform: "scaleX(-1)" }}
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <Button
                    onClick={capture}
                    size="lg"
                    className="rounded-full h-16 w-16 gradient-gold text-primary-foreground"
                  >
                    <Camera className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            )}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Verification selfie"
                className="w-full aspect-[4/3] object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
            )}
          </CardContent>
        </Card>

        <canvas ref={canvasRef} className="hidden" />

        {/* Actions */}
        {previewUrl && (
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={retake}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retake
            </Button>
            <Button
              className="flex-1 gradient-gold text-primary-foreground"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {submitting ? "Verifying..." : "Submit & Verify"}
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Verify;
