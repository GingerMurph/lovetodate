import { useState, useRef, useCallback } from "react";
import { AvatarImage } from "@/components/AvatarImage";

interface PhotoCarouselProps {
  avatarUrl: string | null;
  photoUrls: string[];
  displayName: string;
  aspectClass?: string;
}

export function PhotoCarousel({ avatarUrl, photoUrls, displayName, aspectClass = "aspect-[3/4]" }: PhotoCarouselProps) {
  const allPhotos = [avatarUrl, ...photoUrls].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const didSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (allPhotos.length === 0) {
    return (
      <div className={`relative ${aspectClass} bg-secondary`}>
        <AvatarImage avatarUrl={null} displayName={displayName} />
      </div>
    );
  }

  const goNext = () => setIndex((i) => Math.min(allPhotos.length - 1, i + 1));
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
    didSwipe.current = false;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const elapsed = Date.now() - touchStart.current.time;

    // Horizontal swipe: must travel >40px horizontally, more than vertically, within 500ms
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && elapsed < 500) {
      didSwipe.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    // If we just swiped, ignore the click
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    if (allPhotos.length <= 1) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      e.preventDefault();
      e.stopPropagation();
      goPrev();
    } else if (x > third * 2) {
      e.preventDefault();
      e.stopPropagation();
      goNext();
    }
    // Middle third: let the click propagate (e.g. to Link)
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${aspectClass} bg-secondary select-none`}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <img src={allPhotos[index]} alt={`${displayName} photo ${index + 1}`} className="h-full w-full object-cover pointer-events-none" />

      {/* Dot indicators */}
      {allPhotos.length > 1 && (
        <div className="absolute top-2 inset-x-0 flex justify-center gap-1 z-10 pointer-events-none">
          {allPhotos.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${i === index ? "w-6 bg-gold" : "w-2 bg-foreground/30"}`}
            />
          ))}
        </div>
      )}

      {/* View Profile hint */}
      {allPhotos.length > 1 && (
        <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10">
          <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80 backdrop-blur-sm shadow-sm">Tap to view profile</span>
        </div>
      )}
    </div>
  );
}
