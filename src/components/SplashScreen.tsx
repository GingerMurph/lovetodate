import { useCallback, useRef } from "react";
import splashVideo from "@/assets/splash.mp4";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const called = useRef(false);

  const handleEnd = useCallback(() => {
    if (!called.current) {
      called.current = true;
      onComplete();
    }
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <video
        src={splashVideo}
        autoPlay
        muted
        playsInline
        onEnded={handleEnd}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
};

export default SplashScreen;
