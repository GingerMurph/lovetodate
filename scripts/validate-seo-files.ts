#!/usr/bin/env bun
/**
 * CI validator for public/sitemap.xml and public/robots.txt.
 *
 * Checks:
 *  1. Both files exist and are non-empty.
 *  2. sitemap.xml is well-formed XML with a <urlset> root and valid <url><loc> entries.
 *  3. Every <loc> is an absolute URL on the project origin, unique, and free of
 *     route params (":id" / "$id" / "*").
 *  4. Every indexable public route in src/App.tsx (plus every UK city page) has a
 *     matching sitemap entry.
 *  5. robots.txt has a User-agent block, does not blanket-block crawlers, and any
 *     Sitemap: directive points at the project's sitemap.
 *
 * Exits non-zero on any error.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { UK_CITIES } from "../src/data/ukCities";

const BASE_URL = "https://lovetodate-co-uk.lovable.app";
const SITEMAP = resolve("public/sitemap.xml");
const ROBOTS = resolve("public/robots.txt");
const APP = resolve("src/App.tsx");

const errors: string[] = [];
const notes: string[] = [];

function fail(msg: string) {
  errors.push(msg);
}

// 1. Presence
for (const [label, path] of [
  ["sitemap.xml", SITEMAP],
  ["robots.txt", ROBOTS],
] as const) {
  if (!existsSync(path)) fail(`${label} is missing at ${path}`);
}
if (errors.length) {
  report();
}

const sitemapXml = readFileSync(SITEMAP, "utf8").trim();
const robotsTxt = readFileSync(ROBOTS, "utf8").trim();

if (!sitemapXml) fail("sitemap.xml is empty");
if (!robotsTxt) fail("robots.txt is empty");

// 2. Well-formedness
if (!/^<\?xml\s+version=/.test(sitemapXml)) {
  fail("sitemap.xml does not start with an XML declaration");
}
if (!/<urlset[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(sitemapXml)) {
  fail("sitemap.xml is missing a <urlset> root with the sitemap 0.9 namespace");
}
if (!sitemapXml.endsWith("</urlset>")) {
  fail("sitemap.xml does not close its <urlset> root");
}

// Cheap balance check on the tags we rely on.
const openUrl = (sitemapXml.match(/<url>/g) ?? []).length;
const closeUrl = (sitemapXml.match(/<\/url>/g) ?? []).length;
if (openUrl !== closeUrl) {
  fail(`sitemap.xml has unbalanced <url> tags (${openUrl} open, ${closeUrl} close)`);
}
if (openUrl === 0) fail("sitemap.xml contains no <url> entries");

// 3. <loc> hygiene
const locs = [...sitemapXml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1].trim());
if (locs.length !== openUrl) {
  fail(`sitemap.xml has ${openUrl} <url> entries but ${locs.length} <loc> values`);
}

const seen = new Set<string>();
for (const loc of locs) {
  if (!loc) {
    fail("sitemap.xml contains an empty <loc>");
    continue;
  }
  if (!loc.startsWith(`${BASE_URL}/`) && loc !== BASE_URL) {
    fail(`sitemap <loc> is not on ${BASE_URL}: ${loc}`);
  }
  if (/[:$]\w|\*/.test(loc.replace(/^https?:/, ""))) {
    fail(`sitemap <loc> contains an unresolved route param: ${loc}`);
  }
  if (seen.has(loc)) fail(`duplicate sitemap <loc>: ${loc}`);
  seen.add(loc);
}

// Optional metadata sanity
for (const freq of [...sitemapXml.matchAll(/<changefreq>([^<]*)<\/changefreq>/g)].map((m) => m[1])) {
  if (!/^(always|hourly|daily|weekly|monthly|yearly|never)$/.test(freq)) {
    fail(`invalid <changefreq> value: ${freq}`);
  }
}
for (const p of [...sitemapXml.matchAll(/<priority>([^<]*)<\/priority>/g)].map((m) => m[1])) {
  const n = Number(p);
  if (Number.isNaN(n) || n < 0 || n > 1) fail(`invalid <priority> value: ${p}`);
}
for (const lm of [...sitemapXml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1])) {
  if (!/^\d{4}-\d{2}-\d{2}(T[\d:.+\-Z]+)?$/.test(lm)) fail(`invalid <lastmod> value: ${lm}`);
}

// 4. Route coverage — public (non ProtectedRoute) routes from src/App.tsx
const appSrc = readFileSync(APP, "utf8");
const routeRe = /<Route\s+path="([^"]+)"\s+element=\{([\s\S]*?)\}\s*\/>/g;
const publicRoutes: string[] = [];
for (const m of appSrc.matchAll(routeRe)) {
  const [, path, element] = m;
  if (path === "*") continue;
  if (element.includes("ProtectedRoute")) continue;
  publicRoutes.push(path);
}
if (publicRoutes.length === 0) {
  fail("could not parse any routes from src/App.tsx — update the validator");
}

const expected = new Set<string>();
for (const route of publicRoutes) {
  if (route === "/dating/:city") {
    for (const c of UK_CITIES) expected.add(`/dating/${c.slug}`);
    continue;
  }
  if (route.includes(":") || route.includes("*")) {
    notes.push(`skipped dynamic public route with no known data source: ${route}`);
    continue;
  }
  expected.add(route);
}

const sitemapPaths = new Set(locs.map((l) => l.replace(BASE_URL, "") || "/"));
const missing = [...expected].filter((p) => !sitemapPaths.has(p));
if (missing.length) {
  fail(`sitemap.xml is missing ${missing.length} indexable public route(s): ${missing.join(", ")}`);
}

// 5. robots.txt
if (!/^user-agent:\s*\S+/im.test(robotsTxt)) {
  fail("robots.txt has no User-agent block");
}
const blanketBlock = robotsTxt
  .split(/\r?\n/)
  .some((line) => /^disallow:\s*\/\s*$/i.test(line.trim()));
if (blanketBlock) {
  fail("robots.txt contains a blanket `Disallow: /` which blocks all indexing");
}
const sitemapDirectives = [...robotsTxt.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
for (const s of sitemapDirectives) {
  if (!s.startsWith("http")) fail(`robots.txt Sitemap: directive must be absolute: ${s}`);
  else if (!s.startsWith(BASE_URL)) fail(`robots.txt Sitemap: directive is off-origin: ${s}`);
  else if (!s.endsWith("/sitemap.xml")) fail(`robots.txt Sitemap: directive does not point at /sitemap.xml: ${s}`);
}
if (sitemapDirectives.length === 0) {
  notes.push("robots.txt has no Sitemap: directive (crawlers still find /sitemap.xml).");
}

report();

function report(): never {
  console.log(`Sitemap: ${SITEMAP}`);
  console.log(`Robots:  ${ROBOTS}`);
  console.log(`URLs in sitemap: ${(sitemapXml ?? "").match(/<loc>/g)?.length ?? 0}`);
  for (const n of notes) console.log(`  · ${n}`);
  if (errors.length) {
    console.error(`\n${errors.length} problem(s) found:`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }
  console.log("\n✓ sitemap.xml and robots.txt are present, well-formed, and complete.");
  process.exit(0);
}
