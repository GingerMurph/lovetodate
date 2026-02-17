import { useCallback, useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

const playSplashChime = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0, dur: 0.3 },    // C5
      { freq: 659.25, start: 0.15, dur: 0.3 },  // E5
      { freq: 783.99, start: 0.3, dur: 0.4 },   // G5
      { freq: 1046.5, start: 0.5, dur: 0.6 },   // C6
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    });
    setTimeout(() => ctx.close(), 2000);
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
    playSplashChime();
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
    if (video.currentTime >= 2.0 && !showUrl) {
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
