import { useCallback, useRef, useState } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const called = useRef(false);
  const [showText, setShowText] = useState(false);

  const handleEnd = useCallback(() => {
    setShowText(true);
    setTimeout(() => {
      if (!called.current) {
        called.current = true;
        onComplete();
      }
    }, 2000);
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
      <p
        className={`absolute top-[32%] font-['Playfair_Display'] text-xl tracking-wide transition-opacity duration-1000 ${
          showText ? "opacity-100" : "opacity-0"
        }`}
        style={{ color: "hsl(350, 30%, 40%)" }}
      >
        LoveToDate.co.uk
      </p>
    </div>
  );
};

export default SplashScreen;
