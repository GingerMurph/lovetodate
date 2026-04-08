import { useEffect, useState } from "react";

interface Heart {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  rotation: number;
}

export default function HeartsCelebration({ onComplete }: { onComplete?: () => void }) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    const generated: Heart[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: 16 + Math.random() * 24,
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 1.5,
      rotation: -30 + Math.random() * 60,
    }));
    setHearts(generated);
    const timer = setTimeout(() => onComplete?.(), 3500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {hearts.map((h) => (
        <span
          key={h.id}
          className="absolute text-destructive animate-hearts-fall"
          style={{
            left: `${h.x}%`,
            fontSize: `${h.size}px`,
            animationDelay: `${h.delay}s`,
            animationDuration: `${h.duration}s`,
            transform: `rotate(${h.rotation}deg)`,
          }}
        >
          ❤️
        </span>
      ))}
    </div>
  );
}
