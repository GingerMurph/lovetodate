import { ArrowLeft, Home } from "lucide-react";
import BackgroundImage from "@/components/BackgroundImage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Terms of Service</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <h2 className="font-serif text-foreground">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">By accessing or using Love To Date ("the Service"), operated by lovetodate.co.uk, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.</p>

        <h2 className="font-serif text-foreground">2. Eligibility</h2>
        <p className="text-muted-foreground">You must be at least 18 years old to use Love To Date. By registering, you confirm that you are 18 or older. We may require age verification via government-issued ID. Users who provide false age information will have their accounts terminated immediately.</p>

        <h2 className="font-serif text-foreground">3. Account Registration</h2>
        <p className="text-muted-foreground">You agree to provide accurate, current, and complete information during registration, including your real name, valid email address, and phone number. Phone verification via SMS OTP is mandatory. You are responsible for maintaining the confidentiality of your account credentials.</p>

        <h2 className="font-serif text-foreground">4. User Conduct</h2>
        <p className="text-muted-foreground">You agree not to:</p>
        <ul className="text-muted-foreground">
          <li>Harass, bully, stalk, intimidate, or threaten other users</li>
          <li>Post content that is illegal, defamatory, obscene, or promotes violence</li>
          <li>Impersonate another person or create fake profiles</li>
          <li>Use the Service for commercial solicitation, spam, or scams</li>
          <li>Upload sexually explicit material involving minors</li>
          <li>Use automated bots, scrapers, or other tools to access the Service</li>
          <li>Attempt to circumvent payment mechanisms or exploit free features</li>
        </ul>

        <h2 className="font-serif text-foreground">5. Profile Content</h2>
        <p className="text-muted-foreground">You retain ownership of content you upload but grant Love To Date a non-exclusive, worldwide licence to use, display, and distribute your profile content for the purpose of operating the Service. You must only upload photos of yourself and must have rights to all content you share.</p>

        <h2 className="font-serif text-foreground">6. Verification</h2>
        <p className="text-muted-foreground">Love To Date offers optional identity and age verification. Verified badges indicate that a user has completed our verification process but do not constitute an endorsement or guarantee of safety. ID documents submitted for verification are processed securely and not stored longer than necessary.</p>

        <h2 className="font-serif text-foreground">7. Payments & Subscriptions</h2>
        <p className="text-muted-foreground">Love To Date operates a hybrid model: browsing profiles and seeing who likes you is free. Connecting with matches requires either a one-time payment or an active subscription. Subscription prices are displayed in GBP. Subscriptions auto-renew unless cancelled before the renewal date. Refunds are handled in accordance with UK consumer law and our refund policy. You may manage your subscription through the Stripe customer portal.</p>

        <h2 className="font-serif text-foreground">8. AI Features</h2>
        <p className="text-muted-foreground">Love To Date uses artificial intelligence for compatibility scoring, conversation starters, and content generation. AI-generated content is provided for entertainment and guidance only. Compatibility scores are algorithmic estimates and should not be solely relied upon for dating decisions.</p>

        <h2 className="font-serif text-foreground">9. Games</h2>
        <p className="text-muted-foreground">Interactive games are provided to enhance the dating experience. Game results may be used to inform compatibility scores. Games are offered as-is and we do not guarantee their availability at all times.</p>

        <h2 className="font-serif text-foreground">10. Reporting & Blocking</h2>
        <p className="text-muted-foreground">You may report or block any user at any time. We take reports seriously and will investigate violations of these terms. We reserve the right to suspend or permanently ban accounts that violate our policies, without prior notice.</p>

        <h2 className="font-serif text-foreground">11. Limitation of Liability</h2>
        <p className="text-muted-foreground">Love To Date is provided "as is" without warranties of any kind. We are not responsible for the actions of other users, including any harm arising from in-person meetings. We strongly recommend meeting in public places and informing a trusted person of your plans. Our total liability shall not exceed the amount you paid us in the 12 months preceding any claim.</p>

        <h2 className="font-serif text-foreground">12. Termination</h2>
        <p className="text-muted-foreground">You may delete your account at any time through account settings. We may terminate or suspend your account for violations of these terms. Upon termination, your profile data will be deleted in accordance with our Privacy Policy.</p>

        <h2 className="font-serif text-foreground">13. Changes to Terms</h2>
        <p className="text-muted-foreground">We may update these terms from time to time. Material changes will be communicated via email or in-app notification. Continued use of the Service after changes constitutes acceptance.</p>

        <h2 className="font-serif text-foreground">14. Governing Law</h2>
        <p className="text-muted-foreground">These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>

        <h2 className="font-serif text-foreground">15. Contact</h2>
        <p className="text-muted-foreground">For questions about these terms, contact us at <a href="mailto:support@lovetodate.co.uk" className="text-gold hover:underline">support@lovetodate.co.uk</a>.</p>
      </main>
    </div>
  );
}
