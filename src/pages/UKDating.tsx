import { Link } from "react-router-dom";
import { Heart, MapPin, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackgroundImage from "@/components/BackgroundImage";
import SEO from "@/components/SEO";
import { UK_CITIES } from "@/data/ukCities";

export default function UKDating() {
  const title = "UK Dating App by City | Meet Local Singles | LoveToDate";
  const description = "Free UK dating, city by city. Meet verified local singles in London, Manchester, Birmingham, Edinburgh and 20+ more cities on LoveToDate.";
  const keywords = "UK dating app, dating by city, local singles UK, dating in London, dating in Manchester, dating in Birmingham, free dating UK";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "UK Dating Cities",
    itemListElement: UK_CITIES.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `Dating in ${c.name}`,
      url: `https://lovetodate-co-uk.lovable.app/dating/${c.slug}`,
    })),
  };

  return (
    <>
      <SEO title={title} description={description} path="/dating" keywords={keywords} jsonLd={jsonLd} />
      <BackgroundImage />
      <div className="min-h-screen relative z-10">
        <div className="container mx-auto px-4 py-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Back</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/"><Home className="mr-1 h-4 w-4" />Home</Link></Button>
          </div>

          <header className="text-center mb-10">
            <h1 className="font-serif text-4xl sm:text-5xl text-gold mb-4">Dating across the UK</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Pick your city to meet verified, AI-matched singles near you. Browsing and likes are always free on LoveToDate.</p>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {UK_CITIES.map((c) => (
              <Link key={c.slug} to={`/dating/${c.slug}`} className="group rounded-2xl border border-border bg-card/60 backdrop-blur p-5 hover:border-gold/60 transition-colors">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><MapPin className="h-3 w-3" />{c.region}</div>
                <h2 className="font-serif text-xl text-gold group-hover:underline">Dating in {c.name}</h2>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.blurb}</p>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Button asChild size="lg" className="gradient-gold"><Link to="/auth"><Heart className="mr-2 h-4 w-4" />Join free</Link></Button>
          </div>
        </div>
      </div>
    </>
  );
}
