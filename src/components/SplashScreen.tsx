import { useCallback, useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

const playSplashCheer = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 2.0;
    const sampleRate = ctx.sampleRate;
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(2, bufferSize, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / sampleRate;
        // Layer white noise shaped like a crowd roar
        let sample = (Math.random() * 2 - 1);
        // Envelope: quick rise, sustain, then fade
        let envelope = 0;
        if (t < 0.15) {
          envelope = t / 0.15; // rise
        } else if (t < 1.2) {
          envelope = 1.0 - (t - 0.15) * 0.15; // slow decay
        } else {
          envelope = Math.max(0, (1.0 - (1.2 - 0.15) * 0.15) * (1 - (t - 1.2) / 0.8));
        }
        // Add tonal "wooo" crowd components
        sample += 0.3 * Math.sin(2 * Math.PI * 320 * t + Math.sin(t * 5) * 2);
        sample += 0.2 * Math.sin(2 * Math.PI * 480 * t + Math.sin(t * 7) * 1.5);
        sample += 0.15 * Math.sin(2 * Math.PI * 640 * t + Math.sin(t * 3) * 3);
        // Slight stereo variation
        sample += (channel === 0 ? 0.1 : -0.1) * Math.sin(2 * Math.PI * 400 * t);
        data[i] = sample * envelope * 0.12;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to make it sound more like voices
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    source.connect(filter);
    filter.connect(ctx.destination);
    source.start();

    setTimeout(() => ctx.close(), 3000);
  } catch (e) {
    console.log("Audio not supported");
  }
};

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const called = useRef(false);
  const soundPlayed = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleStart = () => {
    setStarted(true);
    playSplashCheer();
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime >= 0.3 && !showText) {
      setShowText(true);
    }
    if (video.currentTime >= 1.0 && !showSecondLine) {
      setShowSecondLine(true);
    }
    if (video.currentTime >= 3.0 && !showUrl) {
      setShowUrl(true);
    }
  }, [showText, showSecondLine, showUrl]);

  const handleEnd = useCallback(() => {
    setShowText(true);
    setShowSecondLine(true);
    setShowUrl(true);
    setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onComplete();
      }
    }, 1500);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      {!started && (
        <button
          onClick={handleStart}
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer bg-white"
        >
          <p
            className="font-['Playfair_Display'] text-xl tracking-wide animate-pulse"
            style={{ color: "hsl(350, 30%, 40%)" }}
          >
            Tap to begin
          </p>
        </button>
      )}
      <video
        ref={videoRef}
        src={splashVideo}
        muted
        playsInline
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnd}
        className="max-w-full max-h-full object-contain"
      />
      <div className="absolute bottom-[22%] md:bottom-[15%] flex flex-col items-center gap-1">
        <p
          className={`font-['Playfair_Display'] text-xl tracking-wide transition-opacity duration-1000 ${
            showText ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "hsl(350, 30%, 40%)" }}
        >
          from little acorns
        </p>
        <p
          className={`font-['Playfair_Display'] text-2xl font-bold tracking-wide transition-opacity duration-1000 ${
            showSecondLine ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "hsl(350, 30%, 40%)" }}
        >
          grow mighty oaks
        </p>
      </div>
      <p
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-['Playfair_Display'] text-lg tracking-widest transition-opacity duration-1500 ${
          showUrl ? "opacity-100" : "opacity-0"
        }`}
        style={{ color: "hsl(350, 30%, 40%)" }}
      >
        LoveToDate.co.uk
      </p>
    </div>
  );
};

export default SplashScreen;
