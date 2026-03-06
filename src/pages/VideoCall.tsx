import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useAgoraCall } from "@/hooks/useAgoraCall";
import { supabase } from "@/integrations/supabase/client";
import { AvatarImage } from "@/components/AvatarImage";
import { Button } from "@/components/ui/button";
import FiltersPanel from "@/components/video/FiltersPanel";
import CallIcebreakers from "@/components/video/CallIcebreakers";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Sparkles,
  MessageSquare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const VideoCall = () => {
  const { userId: rawPartnerId } = useParams();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const partnerId = rawPartnerId && uuidRegex.test(rawPartnerId) ? rawPartnerId : null;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed, loading: subLoading } = useSubscription();

  const {
    callState,
    error,
    isMuted,
    isVideoOff,
    remoteUser,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    playLocalVideo,
    playRemoteVideo,
  } = useAgoraCall(partnerId);

  const [partner, setPartner] = useState<{ display_name: string; avatar_url: string | null } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showIcebreakers, setShowIcebreakers] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");
  const [activeMask, setActiveMask] = useState("");
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load partner profile
  useEffect(() => {
    if (!partnerId || !user) return;
    supabase.functions.invoke("view-profile", { body: { userId: partnerId } }).then(({ data }) => {
      if (data?.profile) setPartner({ display_name: data.profile.display_name, avatar_url: data.profile.avatar_url });
    });
  }, [partnerId, user]);

  // Play videos when tracks are available
  useEffect(() => {
    if (callState === "connected") {
      playLocalVideo(localVideoRef.current);
    }
  }, [callState, playLocalVideo]);

  useEffect(() => {
    if (remoteUser) {
      playRemoteVideo(remoteVideoRef.current);
    }
  }, [remoteUser, playRemoteVideo]);

  // Call duration timer
  useEffect(() => {
    if (callState === "connected") {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStartCall = useCallback(async () => {
    if (!subscribed) {
      toast.error("You need a subscription for video calls");
      navigate("/subscription");
      return;
    }
    await startCall();
  }, [subscribed, startCall, navigate]);

  const handleEndCall = useCallback(async () => {
    await endCall();
    toast.info("Call ended");
  }, [endCall]);

  if (!partnerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid user</p>
      </div>
    );
  }

  if (subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Remote video (full screen) */}
      <div className="flex-1 relative overflow-hidden">
        {callState === "connected" && remoteUser ? (
          <div
            ref={remoteVideoRef}
            className="absolute inset-0"
            style={{ filter: activeFilter || undefined }}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95">
            {partner && (
              <>
                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-gold/30">
                  <AvatarImage avatarUrl={partner.avatar_url} displayName={partner.display_name} iconSize="h-12 w-12" />
                </div>
                <p className="text-lg font-serif text-foreground">{partner.display_name}</p>
              </>
            )}
            {callState === "idle" && (
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Ready to start a video call?</p>
                {!subscribed ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Subscription required for video calls</p>
                    <Button className="gradient-gold text-primary-foreground" onClick={() => navigate("/subscription")}>
                      Subscribe Now
                    </Button>
                  </div>
                ) : (
                  <Button className="gradient-gold text-primary-foreground gap-2" onClick={handleStartCall}>
                    <Phone className="h-4 w-4" /> Start Video Call
                  </Button>
                )}
              </div>
            )}
            {callState === "connecting" && (
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
                <p className="text-sm text-muted-foreground">Connecting...</p>
              </div>
            )}
            {callState === "error" && (
              <div className="text-center space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={handleStartCall}>Try Again</Button>
              </div>
            )}
            {callState === "ended" && (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Call ended • {formatDuration(callDuration)}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={handleStartCall}>Call Again</Button>
                  <Button variant="ghost" onClick={() => navigate(`/messages/${partnerId}`)}>Back to Chat</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AR Mask overlay */}
        {activeMask && callState === "connected" && (
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-6xl pointer-events-none animate-bounce-slow">
            {activeMask}
          </div>
        )}

        {/* Local video (PiP) */}
        {callState === "connected" && (
          <div
            ref={localVideoRef}
            className="absolute top-4 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-border/50 shadow-lg z-10"
            style={{ filter: activeFilter || undefined }}
          />
        )}

        {/* Call duration */}
        {callState === "connected" && (
          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full z-10">
            <p className="text-xs text-white font-mono">{formatDuration(callDuration)}</p>
          </div>
        )}

        {/* Panels */}
        <FiltersPanel
          open={showFilters}
          onClose={() => setShowFilters(false)}
          activeFilter={activeFilter}
          activeMask={activeMask}
          onFilterChange={setActiveFilter}
          onMaskChange={setActiveMask}
        />
        <CallIcebreakers open={showIcebreakers} onClose={() => setShowIcebreakers(false)} />
      </div>

      {/* Controls bar */}
      <div className="bg-black/80 backdrop-blur-sm px-4 py-4 safe-area-bottom">
        {callState === "connected" ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className={`h-12 w-12 rounded-full ${isMuted ? "bg-destructive/20 text-destructive" : "bg-white/10 text-white"}`}
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-12 w-12 rounded-full ${isVideoOff ? "bg-destructive/20 text-destructive" : "bg-white/10 text-white"}`}
              onClick={toggleVideo}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-12 w-12 rounded-full ${showFilters ? "bg-gold/20 text-gold" : "bg-white/10 text-white"}`}
              onClick={() => { setShowFilters(!showFilters); setShowIcebreakers(false); }}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-12 w-12 rounded-full ${showIcebreakers ? "bg-gold/20 text-gold" : "bg-white/10 text-white"}`}
              onClick={() => { setShowIcebreakers(!showIcebreakers); setShowFilters(false); }}
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 gap-2"
              onClick={() => navigate(`/messages/${partnerId}`)}
            >
              <ArrowLeft className="h-4 w-4" /> Back to Chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
