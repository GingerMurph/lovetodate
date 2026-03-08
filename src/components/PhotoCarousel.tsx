import { useState, useRef, useCallback } from "react";
import { AvatarImage } from "@/components/AvatarImage";
import VerifiedBadge from "@/components/VerifiedBadge";
import SubscriberBadge from "@/components/SubscriberBadge";

interface PhotoCarouselProps {
  avatarUrl: string | null;
  photoUrls: string[];
  displayName: string;
  aspectClass?: string;
  isVerified?: boolean;
  isSubscribed?: boolean;
  onMiddleTap?: () => void;
}

export function PhotoCarousel({ avatarUrl, photoUrls, displayName, aspectClass = "aspect-[3/4]", isVerified, isSubscribed }: PhotoCarouselProps) {
  const allPhotos = [avatarUrl, ...photoUrls].filter(Boolean) as string[];
  const [index, setIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const didSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showBadges = isVerified || isSubscribed;

  if (allPhotos.length === 0) {
    return (
      <div className={`relative ${aspectClass} bg-secondary`}>
        <AvatarImage avatarUrl={null} displayName={displayName} />
        {showBadges && <PhotoBadges isVerified={isVerified} isSubscribed={isSubscribed} />}
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

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && elapsed < 500) {
      didSwipe.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
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

      {/* Verified / Subscriber badges */}
      {showBadges && <PhotoBadges isVerified={isVerified} isSubscribed={isSubscribed} />}

    </div>
  );
}

function PhotoBadges({ isVerified, isSubscribed }: { isVerified?: boolean; isSubscribed?: boolean }) {
  return (
    <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
      {isVerified && (
        <span className="bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-[10px] font-semibold pointer-events-auto">
          <VerifiedBadge size="sm" /> Verified
        </span>
      )}
      {isSubscribed && (
        <span className="bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-[10px] font-semibold pointer-events-auto">
          <SubscriberBadge size="sm" /> Premium
        </span>
      )}
    </div>
  );
}
