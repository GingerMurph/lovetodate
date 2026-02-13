import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const target = searchParams.get("target");
    if (!sessionId || !target) {
      setStatus("error");
      setErrorMsg("Missing payment information");
      return;
    }
    setTargetId(target);

    supabase.functions
      .invoke("verify-unlock-payment", { body: { sessionId } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setStatus("error");
          setErrorMsg(data?.error || error?.message || "Verification failed");
        } else {
          setStatus("success");
        }
      });
  }, [searchParams]);

  return (
    <AppLayout>
      <div className="container mx-auto flex max-w-md items-center justify-center px-4 py-20">
        <Card className="w-full border-border bg-card text-center">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              {status === "verifying" && "Verifying Payment..."}
              {status === "success" && "Connection Unlocked! 🎉"}
              {status === "error" && "Something went wrong"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "verifying" && <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />}
            {status === "success" && (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="text-muted-foreground">You can now connect and exchange details!</p>
                <Button onClick={() => navigate(`/profile/${targetId}`)} className="gradient-gold text-primary-foreground">
                  View Profile
                </Button>
              </>
            )}
            {status === "error" && (
              <>
                <p className="text-destructive">{errorMsg}</p>
                <Button onClick={() => navigate("/discover")} variant="outline">Back to Discover</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default PaymentSuccess;
