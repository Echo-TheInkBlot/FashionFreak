// Photo lookup at the register. Reads inventory and asks the AI; it never changes stock.
// Selling happens only when a staff member taps a button that calls recordSale.
import type { InventoryRepo } from "../inventory/repo";
import type { Category, Product } from "../inventory/types";
import { decideMatchUi, normalizeMatch, preFilterCandidates, type MatchUi, type PhotoHints } from "./rules";
import type { AiProvider, MatchCandidate, PhotoInput } from "./types";

export interface LookupResult {
  ui: MatchUi;
  threshold: number;
  candidates: Product[];
  hints: PhotoHints;
  simulated: boolean;
}

export const toCandidate = (p: Product): MatchCandidate => ({
  id: p.id, sku: p.sku, name: p.name, category: p.category, color: p.color, size: p.size,
  notes: p.ai_description || p.description, photo: p.photos[0] ?? null,
});

export async function lookupByPhoto(
  repo: InventoryRepo,
  ai: AiProvider,
  photo: PhotoInput,
  opts: { category?: Category | null; limit?: number } = {},
): Promise<LookupResult> {
  const [products, settings] = await Promise.all([repo.listProducts(), repo.getSettings()]);

  // Step 1: what is it? Staff can skip this by picking the category themselves.
  let hints: PhotoHints = { category: opts.category ?? null };
  if (!opts.category) {
    const d = await ai.draftListing(photo);
    hints = { category: d.category, color: d.color, description: d.visual_notes };
  }

  // Step 2: compare against the closest sellable items only.
  const candidates = preFilterCandidates(products, hints, opts.limit ?? 8);
  if (candidates.length === 0) {
    return { ui: { mode: "none" }, threshold: settings.ai_confidence_threshold, candidates, hints, simulated: ai.kind === "simulated" };
  }
  const raw = await ai.matchPhoto(photo, candidates.map(toCandidate));
  const match = normalizeMatch(raw, candidates.map((c) => c.id));
  return {
    ui: decideMatchUi(match, settings.ai_confidence_threshold),
    threshold: settings.ai_confidence_threshold,
    candidates,
    hints,
    simulated: ai.kind === "simulated",
  };
}
