import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Flag, Ban, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportBlockOverlayProps {
  partnerId: string;
  onEndCall: () => void;
}

const REPORT_REASONS = [
  "Inappropriate behaviour",
  "Harassment or threats",
  "Fake profile / catfishing",
  "Spam or scam",
  "Other",
];

const ReportBlockOverlay = ({ partnerId, onEndCall }: ReportBlockOverlayProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReasons, setShowReasons] = useState(false);
  const [isBlock, setIsBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (reason: string) => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("reports" as any).insert({
        reporter_id: user.id,
        reported_id: partnerId,
        reason,
        context: "video_call",
        is_block: isBlock,
      } as any);

      if (error) throw error;

      toast.success(isBlock ? "User blocked & reported" : "Report submitted");
      onEndCall();
    } catch (err: any) {
      toast.error("Failed to submit report");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (showReasons) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-72 bg-black/80 backdrop-blur-md rounded-2xl border border-border/30 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            {isBlock ? "Block & Report" : "Report User"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/60 hover:text-white"
            onClick={() => { setShowReasons(false); setShowMenu(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-white/50">Select a reason:</p>
        <div className="space-y-1.5">
          {REPORT_REASONS.map((reason) => (
            <Button
              key={reason}
              variant="ghost"
              size="sm"
              disabled={submitting}
              className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10 text-xs h-9"
              onClick={() => handleSubmit(reason)}
            >
              {reason}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  if (showMenu) {
    return (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-md rounded-2xl border border-border/30 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/10 text-xs"
          onClick={() => { setIsBlock(false); setShowReasons(true); }}
        >
          <Flag className="h-4 w-4 text-amber-400" /> Report User
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
          onClick={() => { setIsBlock(true); setShowReasons(true); }}
        >
          <Ban className="h-4 w-4" /> Block & Report
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white/50 hover:text-white/70 text-xs"
          onClick={() => setShowMenu(false)}
        >
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-20 h-9 gap-1.5 bg-black/40 backdrop-blur-sm text-white/70 hover:text-white hover:bg-destructive/30 rounded-full px-3 text-xs border border-white/10"
      onClick={() => setShowMenu(true)}
    >
      <ShieldAlert className="h-4 w-4" /> Report / Block
    </Button>
  );
};

export default ReportBlockOverlay;
