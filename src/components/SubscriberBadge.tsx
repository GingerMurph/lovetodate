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
          <span className="inline-flex cursor-pointer" role="button" tabIndex={0}>
            <Crown className={`${sizeMap[size]} text-gold inline-block shrink-0 ${className}`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          <p className="text-xs font-medium">Premium Subscriber</p>
          <p className="text-[10px] text-muted-foreground">This user has an active paid subscription</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
