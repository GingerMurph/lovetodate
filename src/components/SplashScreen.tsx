import { useState, useEffect } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"acorn" | "opening" | "heart" | "fadeout">("acorn");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("opening"), 800),
      setTimeout(() => setPhase("heart"), 1600),
      setTimeout(() => setPhase("fadeout"), 3000),
      setTimeout(() => onComplete(), 3600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg
        viewBox="0 0 200 260"
        className="w-40 h-52 sm:w-52 sm:h-64"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stem */}
        <path
          d="M100 20 Q100 0 105 10 Q110 20 100 20"
          fill="hsl(30, 40%, 35%)"
          className="origin-bottom"
        />

        {/* Acorn cap - left half swings open */}
        <g
          style={{
            transition: "transform 0.8s ease-in-out",
            transformOrigin: "48px 85px",
            transform:
              phase !== "acorn"
                ? "rotate(-60deg)"
                : "rotate(0deg)",
          }}
        >
          <path
            d="M48 85 Q48 40 100 30 Q100 60 100 85 Z"
            fill="hsl(30, 40%, 35%)"
            stroke="hsl(30, 35%, 28%)"
            strokeWidth="1"
          />
          <ellipse cx="74" cy="85" rx="26" ry="20" fill="hsl(30, 45%, 30%)" />
          <path d="M60 75 Q80 50 100 45 Q100 60 100 75" fill="none" stroke="hsl(30, 30%, 28%)" strokeWidth="0.8" opacity="0.5" />
        </g>

        {/* Acorn cap - right half swings open */}
        <g
          style={{
            transition: "transform 0.8s ease-in-out",
            transformOrigin: "152px 85px",
            transform:
              phase !== "acorn"
                ? "rotate(60deg)"
                : "rotate(0deg)",
          }}
        >
          <path
            d="M152 85 Q152 40 100 30 Q100 60 100 85 Z"
            fill="hsl(30, 40%, 35%)"
            stroke="hsl(30, 35%, 28%)"
            strokeWidth="1"
          />
          <ellipse cx="126" cy="85" rx="26" ry="20" fill="hsl(30, 45%, 30%)" />
          <path d="M140 75 Q120 50 100 45 Q100 60 100 75" fill="none" stroke="hsl(30, 30%, 28%)" strokeWidth="0.8" opacity="0.4" />
        </g>

        {/* Cap nub on top */}
        <circle
          cx="100" cy="28" r="5" fill="hsl(30, 40%, 32%)"
          style={{
            transition: "opacity 0.5s ease-in-out",
            opacity: phase === "acorn" ? 1 : 0,
          }}
        />

        {/* Acorn body */}
        <path
          d="M52 85 Q48 140 70 175 Q85 195 100 200 Q115 195 130 175 Q152 140 148 85"
          fill="hsl(25, 55%, 45%)"
          stroke="hsl(25, 50%, 35%)"
          strokeWidth="1.5"
        />
        {/* Body shading */}
        <path
          d="M60 90 Q56 135 75 168 Q88 188 100 192"
          fill="none"
          stroke="hsl(25, 45%, 55%)"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Heart - rises from inside acorn */}
        <g
          style={{
            transition: "transform 0.8s ease-out, opacity 0.5s ease-out",
            transform:
              phase === "heart" || phase === "fadeout"
                ? "translateY(-60px) scale(1)"
                : "translateY(20px) scale(0.3)",
            opacity: phase === "heart" || phase === "fadeout" ? 1 : 0,
            transformOrigin: "100px 130px",
          }}
        >
          <path
            d="M100 160 
               C100 160 70 130 70 110 
               C70 95 80 88 90 88 
               C95 88 100 93 100 93 
               C100 93 105 88 110 88 
               C120 88 130 95 130 110 
               C130 130 100 160 100 160Z"
            fill="hsl(350, 55%, 55%)"
            stroke="hsl(350, 60%, 40%)"
            strokeWidth="1.5"
          />
          {/* Heart shine */}
          <ellipse cx="88" cy="105" rx="6" ry="8" fill="hsl(350, 50%, 70%)" opacity="0.5" transform="rotate(-15 88 105)" />
        </g>
      </svg>

      {/* Brand text */}
      <p
        className="font-serif text-lg sm:text-xl mt-6 text-muted-foreground italic transition-opacity duration-500"
        style={{
          opacity: phase === "fadeout" ? 0 : 1,
          transition: "opacity 0.5s ease-in",
        }}
      >
        From little acorns grow mighty oaks
      </p>
    </div>
  );
};

export default SplashScreen;
