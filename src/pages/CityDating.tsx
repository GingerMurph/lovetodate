import { Link, useParams, Navigate } from "react-router-dom";
import { Heart, MapPin, Sparkles, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackgroundImage from "@/components/BackgroundImage";
import SEO from "@/components/SEO";
import { UK_CITIES } from "@/data/ukCities";

export default function CityDating() {
  const { city } = useParams<{ city: string }>();
  const data = UK_CITIES.find((c) => c.slug === city?.toLowerCase());

  if (!data) return <Navigate to="/dating" replace />;

  const title = `Dating in ${data.name} | Meet ${data.name} Singles | LoveToDate`;
  const description = `Free dating in ${data.name}. Meet verified ${data.name} singles on LoveToDate — AI-matched, safe, and serious about real relationships across ${data.region}.`;
  const keywords = `${data.name} dating, dating in ${data.name}, ${data.name} singles, ${data.name} dating app, free dating ${data.name}, meet singles ${data.name}, ${data.region} dating`;
  const path = `/dating/${data.slug}`;

  const url = `https://lovetodate-co-uk.lovable.app${path}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      inLanguage: "en-GB",
      isPartOf: {
        "@type": "WebSite",
        name: "LoveToDate",
        url: "https://lovetodate-co-uk.lovable.app",
      },
      about: {
        "@type": "Place",
        name: data.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: data.name,
          addressRegion: data.region,
          addressCountry: "GB",
        },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `LoveToDate Dating in ${data.name}`,
      serviceType: "Online Dating",
      description,
      url,
      provider: {
        "@type": "Organization",
        name: "LoveToDate",
        url: "https://lovetodate-co-uk.lovable.app",
      },
      areaServed: {
        "@type": "City",
        name: data.name,
        containedInPlace: { "@type": "AdministrativeArea", name: data.region },
      },
      audience: {
        "@type": "PeopleAudience",
        audienceType: `Singles in ${data.name}`,
        geographicArea: {
          "@type": "City",
          name: data.name,
        },
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "GBP",
        description: `Free to browse, like and view verified ${data.name} singles`,
        url,
        availability: "https://schema.org/InStock",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Is LoveToDate free to use in ${data.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes — discovering, liking and viewing full ${data.name} profiles is completely free. You only pay when you decide to unlock messaging with someone you'd genuinely love to date.`,
          },
        },
        {
          "@type": "Question",
          name: `How many singles use LoveToDate in ${data.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `LoveToDate is growing fast across ${data.region}, with verified members in every postcode of ${data.name}. Sign up free to see who's nearby.`,
          },
        },
        {
          "@type": "Question",
          name: `Is it safe to date in ${data.name} online?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Every LoveToDate profile is photo, ID and phone verified, with report and block tools built in. Always meet in public for first dates around ${data.name}.`,
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Popular date spots in ${data.name}`,
      itemListElement: data.landmarks.map((l, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: l,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://lovetodate-co-uk.lovable.app/" },
        { "@type": "ListItem", position: 2, name: "UK Dating", item: "https://lovetodate-co-uk.lovable.app/dating" },
        { "@type": "ListItem", position: 3, name: `Dating in ${data.name}`, item: url },
      ],
    },
  ];


  return (
    <>
      <SEO title={title} description={description} path={path} keywords={keywords} jsonLd={jsonLd} />
      <BackgroundImage />
      <div className="min-h-screen relative z-10">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <div className="flex items-center justify-between mb-6">
            <Button asChild variant="ghost" size="sm"><Link to="/dating"><ArrowLeft className="mr-1 h-4 w-4" />All cities</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/"><Home className="mr-1 h-4 w-4" />Home</Link></Button>
          </div>

          <header className="text-center mb-10">
            <div className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3"><MapPin className="h-4 w-4" />{data.region} · {data.population}</div>
            <h1 className="font-serif text-4xl sm:text-5xl text-gold mb-4">Dating in {data.name}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{data.blurb}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gradient-gold"><Link to="/auth"><Heart className="mr-2 h-4 w-4" />Meet {data.name} singles</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/discover">Browse free</Link></Button>
            </div>
          </header>

          <section className="grid sm:grid-cols-2 gap-6 mb-10">
            <article className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6">
              <h2 className="font-serif text-2xl text-gold mb-3">Why LoveToDate works in {data.name}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Verified, real {data.name} singles — no bots, no catfish</li>
                <li>✓ AI compatibility scored across 15+ dimensions</li>
                <li>✓ Free to browse, like and view full profiles</li>
                <li>✓ You only pay when you find someone you'd love to date</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6">
              <h2 className="font-serif text-2xl text-gold mb-3">Great date ideas in {data.name}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {data.dateIdeas.map((idea) => (<li key={idea}>💛 {idea}</li>))}
              </ul>
            </article>
          </section>

          <section className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 mb-10">
            <h2 className="font-serif text-2xl text-gold mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5" />Popular {data.name} date spots</h2>
            <div className="flex flex-wrap gap-2">
              {data.landmarks.map((l) => (
                <span key={l} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">{l}</span>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="font-serif text-2xl text-gold mb-4">Dating in {data.name}: FAQs</h2>
            <div className="space-y-4">
              <div><h3 className="font-medium mb-1">Is LoveToDate free to use in {data.name}?</h3><p className="text-sm text-muted-foreground">Yes — discovering, liking and viewing full {data.name} profiles is completely free. You only pay when you decide to unlock messaging with someone you'd genuinely love to date.</p></div>
              <div><h3 className="font-medium mb-1">How many singles use LoveToDate in {data.name}?</h3><p className="text-sm text-muted-foreground">LoveToDate is growing fast across {data.region}, with verified members in every postcode of {data.name}. Sign up free to see who's nearby.</p></div>
              <div><h3 className="font-medium mb-1">Is it safe to date in {data.name} online?</h3><p className="text-sm text-muted-foreground">Every LoveToDate profile is photo, ID and phone verified, with report &amp; block tools built in. Always meet in public for first dates around {data.name}.</p></div>
            </div>
          </section>

          <div className="text-center">
            <Button asChild size="lg" className="gradient-gold"><Link to="/auth"><Heart className="mr-2 h-4 w-4" />Start dating in {data.name}</Link></Button>
          </div>
        </div>
      </div>
    </>
  );
}
