/**
 * Strip control chars, role markers, and prompt-injection tokens from
 * user-controlled text before embedding it into an AI prompt.
 */
export function sanitizePrompt(input: unknown, maxLen = 1000): string {
  if (input == null) return "";
  const s = typeof input === "string" ? input : String(input);
  return s
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\\u[0-9a-fA-F]{4}/g, " ")
    .replace(/<\|.*?\|>/g, " ")
    .replace(/\b(system|assistant|user)\s*:/gi, " ")
    .trim()
    .slice(0, maxLen);
}

export function sanitizeList(items: unknown, maxItems = 20, maxLen = 80): string[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, maxItems).map((i) => sanitizePrompt(i, maxLen)).filter(Boolean);
}
