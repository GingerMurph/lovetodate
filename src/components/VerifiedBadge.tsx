import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck className={`${sizeMap[size]} text-blue-500 inline-block shrink-0 ${className}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">ID Verified</p>
      </TooltipContent>
    </Tooltip>
  );
}
