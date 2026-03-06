import { useState, useRef, useCallback, useEffect } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
  ILocalVideoTrack,
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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioRef = useRef<ICameraVideoTrack | IMicrophoneAudioTrack | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const cameraTrackRef = useRef<ICameraVideoTrack | null>(null); // backup when screen sharing

  const cleanup = useCallback(async () => {
    try {
      localAudioRef.current?.close();
      localVideoRef.current?.close();
      screenTrackRef.current?.close();
      cameraTrackRef.current?.close();
      if (clientRef.current) {
        await clientRef.current.leave();
        clientRef.current.removeAllListeners();
      }
    } catch {}
    localAudioRef.current = null;
    localVideoRef.current = null;
    screenTrackRef.current = null;
    cameraTrackRef.current = null;
    clientRef.current = null;
    setRemoteUser(null);
    setIsScreenSharing(false);
  }, []);

  const startCall = useCallback(async () => {
    if (!partnerId) return;
    setCallState("connecting");
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-agora-token", {
        body: { partnerId },
      });
      if (fnError || data?.error) {
        throw new Error(data?.error || fnError?.message || "Failed to get call token");
      }
      const { token, channelName, appId, uid } = data as AgoraTokenResponse;

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

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

      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: "speech_low_quality" },
        {
          encoderConfig: { width: 480, height: 640, frameRate: 15, bitrateMax: 400 },
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

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;

    if (isScreenSharing) {
      // Stop screen share, restore camera
      try {
        if (screenTrackRef.current) {
          await client.unpublish(screenTrackRef.current);
          screenTrackRef.current.close();
          screenTrackRef.current = null;
        }
        if (cameraTrackRef.current) {
          localVideoRef.current = cameraTrackRef.current;
          await client.publish(cameraTrackRef.current);
          cameraTrackRef.current = null;
        }
      } catch {}
      setIsScreenSharing(false);
    } else {
      // Start screen share
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack(
          {
            encoderConfig: { width: 1280, height: 720, frameRate: 10, bitrateMax: 800 },
            optimizationMode: "detail",
          },
          "disable" // no audio from screen
        );

        // Handle the user stopping screen share via browser UI
        const track = Array.isArray(screenTrack) ? screenTrack[0] : screenTrack;
        track.on("track-ended", async () => {
          // Auto-restore camera
          try {
            await client.unpublish(track);
            track.close();
            screenTrackRef.current = null;
            if (cameraTrackRef.current) {
              localVideoRef.current = cameraTrackRef.current;
              await client.publish(cameraTrackRef.current);
              cameraTrackRef.current = null;
            }
          } catch {}
          setIsScreenSharing(false);
        });

        // Unpublish camera, publish screen
        if (localVideoRef.current) {
          cameraTrackRef.current = localVideoRef.current;
          await client.unpublish(localVideoRef.current);
        }
        screenTrackRef.current = track;
        localVideoRef.current = track as any;
        await client.publish(track);
        setIsScreenSharing(true);
      } catch (err: any) {
        // User cancelled the screen picker
        console.log("Screen share cancelled:", err.message);
      }
    }
  }, [isScreenSharing]);

  const playLocalVideo = useCallback((container: HTMLElement | null) => {
    if (container && localVideoRef.current) {
      localVideoRef.current.play(container);
    }
  }, []);

  const playRemoteVideo = useCallback((container: HTMLElement | null) => {
    if (container && remoteUser) {
      remoteUser.videoTrack?.play(container);
      remoteUser.audioTrack?.play();
    }
  }, [remoteUser]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    callState,
    error,
    isMuted,
    isVideoOff,
    isScreenSharing,
    remoteUser,
    localVideoTrack: localVideoRef.current,
    startCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    playLocalVideo,
    playRemoteVideo,
  };
}
