import { ArrowLeft, Home } from "lucide-react";
import BackgroundImage from "@/components/BackgroundImage";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative">
      <BackgroundImage />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-serif text-xl text-gold">Privacy Policy</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl prose prose-sm dark:prose-invert">
        <p className="text-muted-foreground text-sm">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <h2 className="font-serif text-foreground">1. Who We Are</h2>
        <p className="text-muted-foreground">Love To Date is operated by lovetodate.co.uk. We are the data controller for your personal data. Contact us at <a href="mailto:support@lovetodate.co.uk" className="text-gold hover:underline">support@lovetodate.co.uk</a>.</p>

        <h2 className="font-serif text-foreground">2. Data We Collect</h2>
        <p className="text-muted-foreground">We collect the following categories of personal data:</p>
        <ul className="text-muted-foreground">
          <li><strong>Account data:</strong> Name, email address, phone number, date of birth, password (hashed)</li>
          <li><strong>Profile data:</strong> Photos, bio, interests, occupation, education, location (city), physical attributes, personality type, relationship goals, lifestyle preferences (smoking, drinking, pets, children, religion, political beliefs)</li>
          <li><strong>Verification data:</strong> Selfie images (for identity verification), government-issued ID images (for age verification — processed and not retained longer than necessary)</li>
          <li><strong>Usage data:</strong> Likes, messages, game activity, compatibility scores, profile views</li>
          <li><strong>Location data:</strong> Approximate GPS coordinates (stored privately, never exposed to other users — only distance in miles is shared)</li>
          <li><strong>Payment data:</strong> Processed by Stripe; we do not store card details</li>
          <li><strong>Device data:</strong> Browser type, IP address, device identifiers (collected automatically)</li>
          <li><strong>Communication preferences:</strong> Email, SMS, and in-app notification settings</li>
        </ul>

        <h2 className="font-serif text-foreground">3. How We Use Your Data</h2>
        <ul className="text-muted-foreground">
          <li>To create and manage your account</li>
          <li>To display your profile to other users for matchmaking</li>
          <li>To calculate AI-powered compatibility scores</li>
          <li>To generate personalised conversation starters</li>
          <li>To process payments via Stripe</li>
          <li>To verify your identity and age</li>
          <li>To send notifications (email, SMS, in-app) about messages, likes, and game invites</li>
          <li>To send daily digest summaries (7am and 7pm) if you have opted in</li>
          <li>To moderate content and enforce community standards</li>
          <li>To improve our service through anonymised analytics</li>
        </ul>

        <h2 className="font-serif text-foreground">4. Legal Basis (UK GDPR)</h2>
        <ul className="text-muted-foreground">
          <li><strong>Contract:</strong> Processing necessary to provide the dating service you signed up for</li>
          <li><strong>Consent:</strong> Optional notifications (email/SMS digests), cookies, marketing</li>
          <li><strong>Legitimate interest:</strong> Security, fraud prevention, service improvement</li>
          <li><strong>Legal obligation:</strong> Age verification requirements, responding to law enforcement</li>
        </ul>

        <h2 className="font-serif text-foreground">5. Special Category Data</h2>
        <p className="text-muted-foreground">Some profile fields (religion, ethnicity, political beliefs) constitute special category data under UK GDPR. This data is collected only with your explicit consent and is entirely optional. You can remove this data at any time by editing your profile.</p>

        <h2 className="font-serif text-foreground">6. Data Sharing</h2>
        <p className="text-muted-foreground">We do not sell your personal data. We share data only with:</p>
        <ul className="text-muted-foreground">
          <li><strong>Other users:</strong> Your profile information (excluding exact GPS coordinates) is visible to other registered users</li>
          <li><strong>Service providers:</strong> Stripe (payments), Twilio (SMS), Agora (video calls) — each under data processing agreements</li>
          <li><strong>AI providers:</strong> Profile data is processed by AI models to generate compatibility scores and content — data is not retained by the AI provider</li>
          <li><strong>Law enforcement:</strong> When required by law or to protect safety</li>
        </ul>

        <h2 className="font-serif text-foreground">7. Data Retention</h2>
        <ul className="text-muted-foreground">
          <li>Account and profile data: Retained while your account is active, deleted upon account deletion</li>
          <li>Messages: Retained while both accounts are active</li>
          <li>Verification documents: Processed and deleted within 30 days of verification</li>
          <li>Payment records: Retained for 7 years for accounting compliance</li>
          <li>Reports/blocks: Retained for safety purposes even after account deletion</li>
        </ul>

        <h2 className="font-serif text-foreground">8. Your Rights</h2>
        <p className="text-muted-foreground">Under UK GDPR, you have the right to:</p>
        <ul className="text-muted-foreground">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate data via your profile settings</li>
          <li><strong>Erasure:</strong> Delete your account and all associated data</li>
          <li><strong>Restriction:</strong> Pause your profile to limit data processing</li>
          <li><strong>Portability:</strong> Receive your data in a structured format</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Withdraw consent:</strong> Change notification preferences or delete optional profile fields at any time</li>
        </ul>
        <p className="text-muted-foreground">To exercise these rights, email <a href="mailto:support@lovetodate.co.uk" className="text-gold hover:underline">support@lovetodate.co.uk</a>. We will respond within 30 days.</p>

        <h2 className="font-serif text-foreground">9. Location Privacy</h2>
        <p className="text-muted-foreground">Your exact GPS coordinates are stored in a private, access-restricted table that no other user can read. Only approximate distance (in miles) is calculated server-side and shown to other users. You can choose not to share location data.</p>

        <h2 className="font-serif text-foreground">10. Children's Privacy</h2>
        <p className="text-muted-foreground">Love To Date is strictly for users aged 18 and over. We do not knowingly collect data from anyone under 18. If we discover an underage account, it will be immediately terminated.</p>

        <h2 className="font-serif text-foreground">11. International Transfers</h2>
        <p className="text-muted-foreground">Some of our service providers may process data outside the UK. Where this occurs, we ensure appropriate safeguards are in place (e.g., Standard Contractual Clauses, UK adequacy decisions).</p>

        <h2 className="font-serif text-foreground">12. Data Security</h2>
        <p className="text-muted-foreground">We implement industry-standard security measures including encryption in transit and at rest, row-level security policies, rate limiting, and regular security audits. However, no system is 100% secure and we cannot guarantee absolute security.</p>

        <h2 className="font-serif text-foreground">13. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this policy from time to time. Material changes will be communicated via email. The "Last updated" date at the top reflects the most recent revision.</p>

        <h2 className="font-serif text-foreground">14. Complaints</h2>
        <p className="text-muted-foreground">If you are unsatisfied with how we handle your data, you have the right to lodge a complaint with the Information Commissioner's Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">ico.org.uk</a>.</p>

        <h2 className="font-serif text-foreground">15. Contact</h2>
        <p className="text-muted-foreground">Data Controller: lovetodate.co.uk<br/>Email: <a href="mailto:support@lovetodate.co.uk" className="text-gold hover:underline">support@lovetodate.co.uk</a></p>
      </main>
    </div>
  );
}
