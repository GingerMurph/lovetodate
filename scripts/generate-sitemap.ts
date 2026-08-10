// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { UK_CITIES } from "../src/data/ukCities";

const BASE_URL = "https://lovetodate-co-uk.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/auth", changefreq: "monthly", priority: "0.5" },
  { path: "/reset-password", changefreq: "yearly", priority: "0.2" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/dating-advice", changefreq: "weekly", priority: "0.8" },
  { path: "/testimonials", changefreq: "monthly", priority: "0.7" },
  { path: "/conversation-starters", changefreq: "monthly", priority: "0.7" },
  { path: "/discover", changefreq: "daily", priority: "0.8" },
  { path: "/fun", changefreq: "monthly", priority: "0.6" },
  { path: "/fun/my-games", changefreq: "weekly", priority: "0.4" },
  { path: "/subscription", changefreq: "monthly", priority: "0.7" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/cookies", changefreq: "yearly", priority: "0.3" },
  { path: "/dating", changefreq: "weekly", priority: "0.8" },
  ...UK_CITIES.map((c) => ({
    path: `/dating/${c.slug}`,
    changefreq: "weekly" as const,
    priority: "0.7",
  })),
];

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries));
console.log(`sitemap.xml written (${entries.length} entries)`);
