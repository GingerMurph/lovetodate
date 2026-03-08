import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type VerifiedBadgeProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function VerifiedBadge({ size = "md", className = "" }: VerifiedBadgeProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-pointer" role="button" tabIndex={0}>
            <BadgeCheck className={`${sizeMap[size]} text-blue-500 inline-block shrink-0 ${className}`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs font-medium">Photo Verified</p>
          <p className="text-[10px] text-muted-foreground">This user verified their identity with a live photo</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
