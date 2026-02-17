import { useCallback, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const called = useRef(false);
  const [showText, setShowText] = useState(false);
  const [showSecondLine, setShowSecondLine] = useState(false);

  const handleEnd = useCallback(() => {
    setShowText(true);
    setTimeout(() => setShowSecondLine(true), 800);
    setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onComplete();
      }
    }, 2500);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
      <video
        src={splashVideo}
        autoPlay
        muted
        playsInline
        onEnded={handleEnd}
        className="max-w-full max-h-full object-contain"
      />
      <div className="absolute top-[20%] md:top-[15%] flex flex-col items-center gap-1">
        <p
          className={`font-['Playfair_Display'] text-xl tracking-wide transition-opacity duration-1000 ${
            showText ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "hsl(350, 30%, 40%)" }}
        >
          Who would you
        </p>
        <p
          className={`font-['Playfair_Display'] text-2xl font-bold tracking-wide transition-opacity duration-1000 ${
            showSecondLine ? "opacity-100" : "opacity-0"
          }`}
          style={{ color: "hsl(350, 30%, 40%)" }}
        >
          LoveToDate!?
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
