import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  if (allPhotos.length === 0) {
    return (
      <div className={`relative ${aspectClass} bg-secondary`}>
        <AvatarImage avatarUrl={null} displayName={displayName} />
      </div>
    );
  }

  return (
    <div className={`relative ${aspectClass} bg-secondary`}>
      <img src={allPhotos[index]} alt={`${displayName} photo ${index + 1}`} className="h-full w-full object-cover" />
      
      {/* Dot indicators */}
      {allPhotos.length > 1 && (
        <>
          <div className="absolute top-2 inset-x-0 flex justify-center gap-1 z-10">
            {allPhotos.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i === index ? "w-6 bg-gold" : "w-2 bg-foreground/30"}`}
              />
            ))}
          </div>

          {/* Tap areas */}
          <button
            type="button"
            className="absolute inset-y-0 left-0 w-1/3 z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex((i) => Math.max(0, i - 1)); }}
            aria-label="Previous photo"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-1/3 z-10"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIndex((i) => Math.min(allPhotos.length - 1, i + 1)); }}
            aria-label="Next photo"
          />
        </>
      )}
    </div>
  );
}
