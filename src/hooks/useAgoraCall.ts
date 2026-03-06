import { useState, useRef, useCallback, useEffect } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";

// Optimize for low bandwidth & battery
AgoraRTC.setLogLevel(3); // errors only

export type CallState = "idle" | "connecting" | "connected" | "ended" | "error";

interface AgoraTokenResponse {
  token: string;
  channelName: string;
  appId: string;
  uid: number;
}

export function useAgoraCall(partnerId: string | null) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<ICameraVideoTrack | IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);

  const cleanup = useCallback(async () => {
    try {
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current.removeAllListeners();
      }
    } catch {}
    localAudioRef.current = null;
    localVideoRef.current = null;
    clientRef.current = null;
    setRemoteUser(null);
  }, []);

  const startCall = useCallback(async () => {
    if (!partnerId) return;
    setCallState("connecting");
    setError(null);

    try {
      // Get token from edge function
      const { data, error: fnError } = await supabase.functions.invoke("generate-agora-token", {
        body: { partnerId },
      });
      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || "Failed to get call token");
      }
      const { token, channelName, appId, uid } = data as AgoraTokenResponse;

      // Create client optimized for low power
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      // Handle remote user events
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        setRemoteUser(user);
      });
      client.on("user-unpublished", (user, mediaType) => {
        if (mediaType === "video") setRemoteUser((prev) => (prev?.uid === user.uid ? user : prev));
      });
      client.on("user-left", () => {
        setRemoteUser(null);
        setCallState("ended");
      });

      await client.join(appId, channelName, token, uid);

      // Create tracks with low-power settings
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: "speech_low_quality" },
        {
          encoderConfig: {
            width: 480,
            height: 640,
            frameRate: 15,
            bitrateMax: 400,
          },
          optimizationMode: "motion",
        }
      );

      localAudioRef.current = audioTrack;
      localVideoRef.current = videoTrack;
      await client.publish([audioTrack, videoTrack]);

      setCallState("connected");
    } catch (err: any) {
      console.error("Call error:", err);
      setError(err.message || "Failed to connect");
      setCallState("error");
      await cleanup();
    }
  }, [partnerId, cleanup]);

  const endCall = useCallback(async () => {
    setCallState("ended");
    await cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    if (localAudioRef.current) {
      const newMuted = !isMuted;
      (localAudioRef.current as IMicrophoneAudioTrack).setEnabled?.(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(() => {
    if (localVideoRef.current) {
      const newOff = !isVideoOff;
      localVideoRef.current.setEnabled(!newOff);
      setIsVideoOff(newOff);
    }
  }, [isVideoOff]);

  // Play local video into a container
  const playLocalVideo = useCallback((container: HTMLElement | null) => {
    if (container && localVideoRef.current) {
      localVideoRef.current.play(container);
    }
  }, []);

  // Play remote video into a container
  const playRemoteVideo = useCallback((container: HTMLElement | null) => {
    if (container && remoteUser) {
      remoteUser.videoTrack?.play(container);
      remoteUser.audioTrack?.play();
    }
  }, [remoteUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    error,
    isMuted,
    isVideoOff,
    remoteUser,
    localVideoTrack: localVideoRef.current,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    playLocalVideo,
    playRemoteVideo,
  };
}
