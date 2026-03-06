import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

export interface VideoFilter {
  name: string;
  css: string;
  emoji: string;
}

export const VIDEO_FILTERS: VideoFilter[] = [
  { name: "None", css: "", emoji: "🚫" },
  { name: "Warm", css: "sepia(0.3) saturate(1.4) brightness(1.05)", emoji: "☀️" },
  { name: "Cool", css: "hue-rotate(200deg) saturate(0.8) brightness(1.1)", emoji: "❄️" },
  { name: "Vintage", css: "sepia(0.6) contrast(1.1) brightness(0.9)", emoji: "📷" },
  { name: "Dramatic", css: "contrast(1.4) saturate(1.3) brightness(0.95)", emoji: "🎭" },
  { name: "Soft", css: "blur(0.5px) brightness(1.1) saturate(0.9)", emoji: "🌸" },
  { name: "B&W", css: "grayscale(1) contrast(1.2)", emoji: "🖤" },
  { name: "Neon", css: "saturate(2.5) brightness(1.15) hue-rotate(10deg)", emoji: "💜" },
];

export const AR_MASKS = [
  { name: "None", emoji: "🚫", overlay: null },
  { name: "Sunglasses", emoji: "😎", overlay: "🕶️" },
  { name: "Crown", emoji: "👑", overlay: "👑" },
  { name: "Hearts", emoji: "💕", overlay: "💕" },
  { name: "Star Eyes", emoji: "🤩", overlay: "⭐" },
  { name: "Devil", emoji: "😈", overlay: "😈" },
  { name: "Angel", emoji: "😇", overlay: "😇" },
  { name: "Party", emoji: "🎉", overlay: "🥳" },
];

interface FiltersPanelProps {
  open: boolean;
  onClose: () => void;
  activeFilter: string;
  activeMask: string;
  onFilterChange: (css: string) => void;
  onMaskChange: (mask: string) => void;
}

export default function FiltersPanel({
  open,
  onClose,
  activeFilter,
  activeMask,
  onFilterChange,
  onMaskChange,
}: FiltersPanelProps) {
  if (!open) return null;

  return (
    <div className="absolute bottom-20 left-2 right-2 bg-card/95 backdrop-blur-sm rounded-xl border border-border p-3 z-20 animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-gold" /> Filters & Masks
        </h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* CSS Filters */}
      <p className="text-xs text-muted-foreground mb-1.5">Filters</p>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {VIDEO_FILTERS.map((f) => (
          <button
            key={f.name}
            onClick={() => onFilterChange(f.css)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
              activeFilter === f.css
                ? "border-gold bg-gold/10 text-gold"
                : "border-border hover:border-gold/30"
            }`}
          >
            <span className="text-base">{f.emoji}</span>
            <span>{f.name}</span>
          </button>
        ))}
      </div>

      {/* AR Masks */}
      <p className="text-xs text-muted-foreground mb-1.5">AR Masks</p>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {AR_MASKS.map((m) => (
          <button
            key={m.name}
            onClick={() => onMaskChange(m.overlay || "")}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors shrink-0 ${
              activeMask === (m.overlay || "")
                ? "border-gold bg-gold/10 text-gold"
                : "border-border hover:border-gold/30"
            }`}
          >
            <span className="text-base">{m.emoji}</span>
            <span>{m.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
