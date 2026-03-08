import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import BackgroundImage from "@/components/BackgroundImage";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get("redirect") || "/discover";
      navigate(redirect);
    }
  }, [user, navigate, searchParams]);



  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a password reset link");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      }
    } else {
      if (!displayName.trim()) {
        toast.error("Please enter your name");
        setLoading(false);
        return;
      }

      if (!agreedToPrivacy) {
        toast.error("Please agree to the Privacy Policy and Terms of Service");
        setLoading(false);
        return;
      }

      // Check if email already exists before attempting signup
      try {
        const { data: checkData } = await supabase.functions.invoke("check-email-exists", {
          body: { email },
        });
        if (checkData?.exists) {
          toast.error("An account with this email already exists. Please sign in instead.");
          setLoading(false);
          return;
        }
      } catch {
        // If the check fails, proceed with signup anyway
      }

      const { error, data } = await signUp(email, password, displayName, phoneNumber);
      if (error) {
        const msg = error.message?.toLowerCase() || "";
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("already exists")) {
          toast.error("An account with this email already exists. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
      } else if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast.error("An account with this email already exists. Please sign in instead.");
      } else {
        toast.success("Check your email to confirm your account");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <BackgroundImage />
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center relative">
          <button onClick={() => navigate(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Link to="/" className="font-serif text-3xl text-gold">Love To Date</Link>
        </div>

        {isForgotPassword ? (
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl">Reset Password</CardTitle>
              <CardDescription>Enter your email and we'll send you a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input id="reset-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full gradient-gold font-semibold" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => setIsForgotPassword(false)} className="text-sm text-gold hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="font-serif text-2xl">{isLogin ? "Welcome Back" : "Join Love To Date"}</CardTitle>
              <CardDescription>{isLogin ? "Sign in to your account" : "Create your free account"}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input id="name" name="name" autoComplete="name" placeholder="Your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required={!isLogin} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete={isLogin ? "username" : "email"} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+44 7700 900000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Include country code. You'll verify this after signing up.</p>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {isLogin && (
                      <button type="button" onClick={() => setIsForgotPassword(true)} className="text-xs text-gold hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {!isLogin && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="privacy"
                        checked={agreedToPrivacy}
                        onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
                        className="mt-0.5"
                      />
                      <label htmlFor="privacy" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                        I agree to the{" "}
                        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">Privacy Policy</a>
                        {" "}and{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline font-medium">Terms of Service</a>
                      </label>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 text-[10px] text-muted-foreground leading-relaxed">
                      <p><strong>🔒 Your data is protected:</strong> We collect personal information (name, email, phone, photos) to provide our dating service. ID documents are processed by AI for age verification only and stored securely. We never share your data with third parties for marketing. You can delete your account and all associated data at any time.</p>
                    </div>
                  </div>
                )}
                <Button type="submit" className="w-full gradient-gold font-semibold" disabled={loading}>
                  {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
                </Button>
              </form>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button onClick={() => setIsLogin(!isLogin)} className="text-gold hover:underline font-medium">
                  {isLogin ? "Sign up free" : "Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
