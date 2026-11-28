// Pure rules for AI photo features. No network, no stock changes: safe to unit test.
import type { Category, Product } from "../inventory/types";
import { CATEGORIES } from "../inventory/types";

/** What the model says about a photo when matching it against candidates. */
export interface RawMatch {
  best_match_id: string | null;
  confidence: number;
  reason: string;
  alternatives: { id: string; confidence: number; reason?: string }[];
}

export interface MatchOption {
  productId: string;
  confidence: number;
  reason: string;
}

/** Cleaned-up result: only real candidate ids, confidences in 0..1, at most 3 options, best first. */
export interface NormalizedMatch {
  best: MatchOption | null;
  options: MatchOption[];
}

/**
 * What the staff screen should show. There is deliberately no "sell" outcome:
 * the best the AI can do is offer a one-tap confirm. A staff member must tap it.
 */
export type MatchUi =
  | { mode: "confirm"; option: MatchOption; others: MatchOption[] }
  | { mode: "choose"; options: MatchOption[] }
  | { mode: "none" };

const clamp01 = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** Drops ids the model made up, clamps confidences, removes duplicates, sorts best first, caps at 3. */
export function normalizeMatch(raw: RawMatch, candidateIds: readonly string[]): NormalizedMatch {
  const allowed = new Set(candidateIds);
  const seen = new Set<string>();
  const all: MatchOption[] = [];
  const push = (id: string | null | undefined, confidence: unknown, reason?: string) => {
    if (!id || !allowed.has(id) || seen.has(id)) return;
    seen.add(id);
    all.push({ productId: id, confidence: clamp01(confidence), reason: (reason ?? "").slice(0, 300) });
  };
  push(raw.best_match_id, raw.confidence, raw.reason);
  for (const a of raw.alternatives ?? []) push(a.id, a.confidence, a.reason);
  all.sort((a, b) => b.confidence - a.confidence);
  const options = all.slice(0, 3);
  return { best: options[0] ?? null, options };
}

/**
 * High confidence (at or above the store's threshold) shows one big "Confirm sold" button.
 * Anything lower shows the top 3 side by side so staff pick, or search by hand.
 */
export function decideMatchUi(match: NormalizedMatch, threshold: number): MatchUi {
  if (!match.best) return { mode: "none" };
  const t = Number.isFinite(threshold) ? Math.min(1, Math.max(0.5, threshold)) : 0.85;
  if (match.best.confidence >= t) {
    return { mode: "confirm", option: match.best, others: match.options.slice(1) };
  }
  return { mode: "choose", options: match.options };
}

/** Rough words from a photo description, used to rank candidates before asking the model. */
const STOP = new Set(["a", "an", "and", "the", "with", "of", "in", "on", "to", "for", "at", "is", "it", "its", "or"]);
function words(s: string | null | undefined): Set<string> {
  return new Set(
    (s ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export interface PhotoHints {
  category?: Category | null;
  color?: string | null;
  description?: string | null;
}

/**
 * Narrows the shop down to the items worth sending to the model with the photo.
 * Only items that can still be sold are considered. Category and color weigh most,
 * then overlap with the visual notes, then newer items.
 */
export function preFilterCandidates(products: Product[], hints: PhotoHints, limit = 8): Product[] {
  const want = words(hints.description);
  const color = hints.color?.toLowerCase().trim() || null;
  const sellable = products.filter((p) => p.status === "available" && p.quantity > 0);
  const scored = sellable.map((p) => {
    let score = 0;
    if (hints.category && p.category === hints.category) score += 10;
    if (color && p.color) {
      if (p.color === color) score += 6;
      else if (p.color === "multi" || color === "multi") score += 2;
    }
    const have = words(`${p.ai_description ?? ""} ${p.name} ${p.tags.join(" ")}`);
    for (const w of want) if (have.has(w)) score += 1;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score || b.p.created_at.localeCompare(a.p.created_at));
  return scored.slice(0, Math.max(1, limit)).map((s) => s.p);
}

export const isCategory = (c: unknown): c is Category => typeof c === "string" && (CATEGORIES as readonly string[]).includes(c);
