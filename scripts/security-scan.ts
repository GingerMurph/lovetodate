#!/usr/bin/env bun
/**
 * Static security scanner for CI.
 * Exits non-zero on any "fail" severity finding.
 *
 * Checks:
 *  1. Exposed secrets — scan tracked files for API key patterns.
 *  2. Edge function auth — every supabase/functions/<fn>/index.ts must either
 *     validate Authorization headers, use a cron secret, or be on the
 *     intentional public-webhook allowlist.
 *  3. RLS coverage — every CREATE TABLE in supabase/migrations must be paired
 *     with an `ENABLE ROW LEVEL SECURITY` (in any migration).
 *  4. Dangerous RLS — flag `USING (true)` policies that aren't read-only public.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Severity = "pass" | "warn" | "fail";
interface Finding {
  id: string;
  category: string;
  title: string;
  severity: Severity;
  detail: string;
}

const ROOT = process.cwd();
const findings: Finding[] = [];

const PUBLIC_WEBHOOK_FNS = new Set<string>([]);
const CRON_SECRET_FNS = new Set<string>([
  "scheduled-digest",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === "build" ||
      entry.startsWith(".next")
    ) continue;
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. Exposed secrets
const SECRET_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "aws_access_key", re: /AKIA[0-9A-Z]{16}/ },
  { id: "stripe_live_secret", re: /sk_live_[0-9a-zA-Z]{16,}/ },
  { id: "stripe_test_secret", re: /sk_test_[0-9a-zA-Z]{16,}/ },
  { id: "openai_key", re: /sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}/ },
  { id: "google_api_key", re: /AIza[0-9A-Za-z_\-]{35}/ },
  { id: "generic_pem", re: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
  { id: "supabase_service_role", re: /service_role[^a-zA-Z0-9]{0,5}["'][A-Za-z0-9._\-]{60,}["']/ },
];

const allFiles = walk(ROOT).filter((f) => {
  const rel = relative(ROOT, f);
  if (rel.startsWith("scripts/security-scan.ts")) return false;
  if (rel.startsWith(".env")) return false; // not in repo, but skip anyway
  return /\.(ts|tsx|js|jsx|json|toml|yml|yaml|md|html|css|sh)$/.test(f);
});

let secretHits = 0;
for (const file of allFiles) {
  let content: string;
  try { content = readFileSync(file, "utf8"); } catch { continue; }
  for (const { id, re } of SECRET_PATTERNS) {
    const m = content.match(re);
    if (m) {
      secretHits++;
      findings.push({
        id: `secret.${id}.${relative(ROOT, file)}`,
        category: "Exposed secrets",
        title: `Possible ${id} in ${relative(ROOT, file)}`,
        severity: "fail",
        detail: `Matched pattern; remove and rotate the secret.`,
      });
    }
  }
}
if (secretHits === 0) {
  findings.push({
    id: "secret.none",
    category: "Exposed secrets",
    title: "No secret patterns detected in tracked code",
    severity: "pass",
    detail: `Scanned ${allFiles.length} files.`,
  });
}

// 2. Edge function auth
const fnsDir = join(ROOT, "supabase", "functions");
try {
  for (const entry of readdirSync(fnsDir)) {
    if (entry.startsWith("_")) continue;
    const indexPath = join(fnsDir, entry, "index.ts");
    let src: string;
    try { src = readFileSync(indexPath, "utf8"); } catch { continue; }

    if (PUBLIC_WEBHOOK_FNS.has(entry)) {
      findings.push({
        id: `edgefn.${entry}`,
        category: "Edge function auth",
        title: `${entry}: intentionally public`,
        severity: "pass",
        detail: "On public-webhook allowlist.",
      });
      continue;
    }
    if (CRON_SECRET_FNS.has(entry)) {
      const usesCron = /CRON_SECRET|x-cron-secret/i.test(src);
      findings.push({
        id: `edgefn.${entry}`,
        category: "Edge function auth",
        title: `${entry}: cron secret`,
        severity: usesCron ? "pass" : "fail",
        detail: usesCron ? "Validates CRON_SECRET." : "Expected CRON_SECRET validation, none found.",
      });
      continue;
    }
    const checksAuth =
      /Authorization/i.test(src) &&
      (/getClaims|getUser|verifyJwt|jwtVerify/.test(src) || /Bearer /.test(src));
    findings.push({
      id: `edgefn.${entry}`,
      category: "Edge function auth",
      title: `${entry}: ${checksAuth ? "validates JWT" : "MISSING auth validation"}`,
      severity: checksAuth ? "pass" : "fail",
      detail: checksAuth
        ? "Reads Authorization header and validates the JWT."
        : "No Authorization header validation detected. Add JWT check or add to public-webhook allowlist.",
    });
  }
} catch (e) {
  findings.push({
    id: "edgefn.scan_failed",
    category: "Edge function auth",
    title: "Could not scan edge functions",
    severity: "warn",
    detail: String(e),
  });
}

// 3 & 4. RLS coverage + dangerous policies
const migrationsDir = join(ROOT, "supabase", "migrations");
const createdTables = new Set<string>();
const rlsEnabledTables = new Set<string>();
const dangerousPolicies: string[] = [];

try {
  for (const f of readdirSync(migrationsDir)) {
    if (!f.endsWith(".sql")) continue;
    const sql = readFileSync(join(migrationsDir, f), "utf8");
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?/gi)) {
      createdTables.add(m[1].toLowerCase());
    }
    for (const m of sql.matchAll(/alter\s+table\s+(?:public\.)?["']?([a-z_][a-z0-9_]*)["']?\s+enable\s+row\s+level\s+security/gi)) {
      rlsEnabledTables.add(m[1].toLowerCase());
    }
    for (const m of sql.matchAll(/create\s+policy[\s\S]{1,400}?using\s*\(\s*true\s*\)/gi)) {
      dangerousPolicies.push(`${f}: ${m[0].slice(0, 80).replace(/\s+/g, " ")}…`);
    }
  }
  for (const t of createdTables) {
    const ok = rlsEnabledTables.has(t);
    findings.push({
      id: `rls.${t}`,
      category: "RLS coverage",
      title: `public.${t}: ${ok ? "RLS enabled" : "RLS NOT ENABLED"}`,
      severity: ok ? "pass" : "fail",
      detail: ok ? "Migration enables row level security." : "Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and policies.",
    });
  }
  for (const p of dangerousPolicies) {
    findings.push({
      id: `rls.permissive.${p.slice(0, 30)}`,
      category: "RLS coverage",
      title: "Permissive RLS policy detected (USING true)",
      severity: "warn",
      detail: p,
    });
  }
} catch (e) {
  findings.push({
    id: "rls.scan_failed",
    category: "RLS coverage",
    title: "Could not scan migrations",
    severity: "warn",
    detail: String(e),
  });
}

// Report
const counts = {
  pass: findings.filter((f) => f.severity === "pass").length,
  warn: findings.filter((f) => f.severity === "warn").length,
  fail: findings.filter((f) => f.severity === "fail").length,
};

const out = { counts, findings };
console.log(JSON.stringify(out, null, 2));

console.error(`\nSecurity scan: ${counts.pass} pass · ${counts.warn} warn · ${counts.fail} fail`);
if (counts.fail > 0) {
  console.error("Critical findings detected — failing build.");
  for (const f of findings.filter((x) => x.severity === "fail")) {
    console.error(`  ✗ [${f.category}] ${f.title}`);
  }
  process.exit(1);
}
process.exit(0);
