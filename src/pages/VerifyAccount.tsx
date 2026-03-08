import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Shield, CheckCircle, Loader2, Upload, ArrowLeft, FileCheck } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";

const VerifyAccount = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [documentType, setDocumentType] = useState<string>("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);

  // Check existing verification status
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone_verified, age_verified")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if ((data as any)?.phone_verified) setPhoneVerified(true);
        if ((data as any)?.age_verified) setAgeVerified(true);
      });
  }, [user]);

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    // Basic E.164 validation
    const cleaned = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      toast.error("Please enter a valid phone number with country code (e.g. +44...)");
      return;
    }

    setSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-phone-otp", {
        body: { phone_number: cleaned },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPhoneNumber(cleaned);
      setOtpSent(true);
      toast.success("Verification code sent to your phone!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send verification code");
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setVerifyingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-phone-otp", {
        body: { otp_code: otpCode, phone_number: phoneNumber },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPhoneVerified(true);
      toast.success("Phone number verified! ✅");
    } catch (err: any) {
      toast.error(err.message || "Invalid code");
    }
    setVerifyingPhone(false);
  };

  const handleDocumentUpload = async () => {
    if (!documentFile || !documentType || !user) {
      toast.error("Please select a document type and upload your ID");
      return;
    }

    // Validate file
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(documentFile.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image");
      return;
    }
    if (documentFile.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    setUploadingDoc(true);
    try {
      const ext = documentFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/age_verification.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("profile-photos")
        .upload(path, documentFile, { upsert: true, contentType: documentFile.type });
      if (uploadErr) throw uploadErr;

      const { data, error } = await supabase.functions.invoke("verify-age-document", {
        body: { document_path: path, document_type: documentType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setAgeVerified(true);
      toast.success("Age verified successfully! ✅");
    } catch (err: any) {
      toast.error(err.message || "Age verification failed");
    }
    setUploadingDoc(false);
  };

  const allVerified = phoneVerified && ageVerified;

  return (
    <AppLayout>
      <div className="container mx-auto max-w-md px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-2 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>

        <h1 className="mb-2 font-serif text-2xl font-bold text-center">
          Account <span className="text-gold">Verification</span>
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Verify your phone number and age to access all features.
        </p>

        {/* Step 1: Phone Verification */}
        <Card className="mb-4 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {phoneVerified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Phone className="h-5 w-5 text-gold" />
              )}
              Phone Verification
            </CardTitle>
            <CardDescription>
              {phoneVerified
                ? "Your phone number has been verified"
                : "We'll send a 6-digit code to verify your number"}
            </CardDescription>
          </CardHeader>
          {!phoneVerified && (
            <CardContent className="space-y-3">
              {!otpSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+44 7700 900000"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Include country code (e.g. +44 for UK)</p>
                  </div>
                  <Button
                    onClick={handleSendOtp}
                    className="w-full gradient-gold font-semibold"
                    disabled={sendingOtp}
                  >
                    {sendingOtp ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4 mr-2" />
                    )}
                    {sendingOtp ? "Sending..." : "Send Verification Code"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter 6-digit code</Label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center text-xl tracking-[0.5em]"
                    />
                    <p className="text-xs text-muted-foreground">Sent to {phoneNumber}</p>
                  </div>
                  <Button
                    onClick={handleVerifyOtp}
                    className="w-full gradient-gold font-semibold"
                    disabled={verifyingPhone}
                  >
                    {verifyingPhone ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    {verifyingPhone ? "Verifying..." : "Verify Code"}
                  </Button>
                  <button
                    onClick={() => { setOtpSent(false); setOtpCode(""); }}
                    className="text-sm text-gold hover:underline w-full text-center"
                  >
                    Change number or resend
                  </button>
                </>
              )}
            </CardContent>
          )}
        </Card>

        {/* Step 2: Age Verification */}
        <Card className="mb-4 border-border bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {ageVerified ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <Shield className="h-5 w-5 text-gold" />
              )}
              Age Verification (18+)
            </CardTitle>
            <CardDescription>
              {ageVerified
                ? "Your age has been verified"
                : "Upload a photo of your driving license or passport to verify you're 18+"}
            </CardDescription>
          </CardHeader>
          {!ageVerified && (
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driving_license">Driving License</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="doc-upload">Upload Document Photo</Label>
                <div className="relative">
                  <input
                    id="doc-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => document.getElementById("doc-upload")?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {documentFile ? documentFile.name : "Choose file..."}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WebP • Max 10MB • Ensure the date of birth is clearly visible
                </p>
              </div>

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Privacy Notice
                </p>
                <p>Your ID document is processed by AI to extract your date of birth only. The image is stored securely and is never shared with third parties. We use this solely to verify you meet the minimum age requirement of 18.</p>
              </div>

              <Button
                onClick={handleDocumentUpload}
                className="w-full gradient-gold font-semibold"
                disabled={uploadingDoc || !documentType || !documentFile}
              >
                {uploadingDoc ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4 mr-2" />
                )}
                {uploadingDoc ? "Verifying..." : "Verify Age"}
              </Button>
            </CardContent>
          )}
        </Card>

        {allVerified && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-500">
              <CheckCircle className="h-6 w-6" />
              <span className="font-semibold">All verifications complete!</span>
            </div>
            <Button
              onClick={() => navigate("/discover")}
              className="gradient-gold text-primary-foreground"
            >
              Continue to Discover
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default VerifyAccount;
