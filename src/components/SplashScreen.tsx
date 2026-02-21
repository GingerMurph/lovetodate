import { useCallback, useEffect, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

const playSplashCheer = () => {
  try {
    const sampleRate = 44100;
    const duration = 2.0;
    const numSamples = Math.floor(sampleRate * duration);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const buf = new ArrayBuffer(headerSize + dataSize);
    const view = new DataView(buf);

    // WAV header
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    // Generate cheer samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = (Math.random() * 2 - 1) * 0.6;
      // Envelope
      let env = 0;
      if (t < 0.1) env = t / 0.1;
      else if (t < 1.0) env = 1.0;
      else env = Math.max(0, 1.0 - (t - 1.0));
      // Crowd tonal "wooo"
      sample += 0.4 * Math.sin(2 * Math.PI * 300 * t + Math.sin(t * 6) * 2);
      sample += 0.3 * Math.sin(2 * Math.PI * 500 * t + Math.sin(t * 8) * 1.5);
      sample += 0.2 * Math.sin(2 * Math.PI * 700 * t + Math.sin(t * 4) * 3);
      const val = Math.max(-1, Math.min(1, sample * env * 0.7));
      view.setInt16(headerSize + i * 2, val * 32767, true);
    }

    const blob = new Blob([buf], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.volume = 1.0;
    audio.play().catch((e) => console.error("Audio play failed:", e));
    audio.onended = () => URL.revokeObjectURL(url);
  } catch (e) {
    console.error("Audio cheer error:", e);
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
    // Both must be synchronous within the click handler
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
