import { Crown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SubscriberBadgeProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export default function SubscriberBadge({ size = "md", className = "" }: SubscriberBadgeProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Crown className={`${sizeMap[size]} text-gold inline-block shrink-0 ${className}`} />
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Premium Subscriber</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
