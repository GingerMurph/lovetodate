import { useRef, useState, type TouchEvent, type MouseEvent } from "react";

type SwipeCardProps = {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children: React.ReactNode;
};

export default function SwipeCard({ onSwipeLeft, onSwipeRight, children }: SwipeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const hasMoved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const THRESHOLD = 100;

  const handleStart = (x: number, y: number) => {
    setIsDragging(true);
    hasMoved.current = false;
    startPos.current = { x, y };
  };

  const handleMove = (x: number, y: number) => {
    if (!isDragging) return;
    const dx = x - startPos.current.x;
    const dy = y - startPos.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved.current = true;
    setOffset({ x: dx, y: dy * 0.3 });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offset.x > THRESHOLD) {
      animateOut("right");
    } else if (offset.x < -THRESHOLD) {
      animateOut("left");
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const animateOut = (direction: "left" | "right") => {
    const target = direction === "right" ? 600 : -600;
    setOffset({ x: target, y: offset.y });
    setTimeout(() => {
      setOffset({ x: 0, y: 0 });
      if (direction === "right") onSwipeRight();
      else onSwipeLeft();
    }, 250);
  };

  const rotation = offset.x * 0.08;
  const opacity = Math.max(1 - Math.abs(offset.x) / 400, 0.2);

  // Determine swipe indicator
  const showLike = offset.x > 40;
  const showNope = offset.x < -40;

  return (
    <div
      ref={cardRef}
      className="relative touch-none select-none cursor-grab active:cursor-grabbing"
      onClickCapture={(e) => {
        if (hasMoved.current) { e.preventDefault(); e.stopPropagation(); }
      }}
      style={{
        transform: `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${rotation}deg)`,
        opacity,
        transition: isDragging ? "none" : "all 0.25s ease-out",
      }}
      onTouchStart={(e: TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e: TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
      onMouseDown={(e: MouseEvent) => { e.preventDefault(); handleStart(e.clientX, e.clientY); }}
      onMouseMove={(e: MouseEvent) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (isDragging) handleEnd(); }}
    >
      {/* Swipe indicators */}
      {showLike && (
        <div className="absolute top-6 left-6 z-10 rounded-lg border-4 border-green-500 px-4 py-2 text-2xl font-bold text-green-500 rotate-[-15deg]">
          LIKE
        </div>
      )}
      {showNope && (
        <div className="absolute top-6 right-6 z-10 rounded-lg border-4 border-red-500 px-4 py-2 text-2xl font-bold text-red-500 rotate-[15deg]">
          NOPE
        </div>
      )}
      {children}
    </div>
  );
}
