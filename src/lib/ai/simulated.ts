// Stand-in for Claude when ANTHROPIC_API_KEY isn't set, so the demo can show every screen.
// The staff app labels these results "Simulated" everywhere. They are never shown as real AI output.
import { createHash } from "node:crypto";
import type { AiProvider, ListingDraft, MatchCandidate, PhotoInput } from "./types";

const DRAFTS: ListingDraft[] = [
  { name: "Cosmic Fringe Suede Vest", description: "Butter-soft tan suede with fringe that sways when you do. Festival ready, hands-on encouraged.",
    category: "jackets", color: "tan", tags: ["70s", "fringe", "suede", "festival"], visual_notes: "tan suede vest, long fringe at hem and back yoke, open front, cropped", size_on_tag: null },
  { name: "Velvet Crush Slip Dress", description: "Plum crushed velvet that clings in all the right places. Thin straps, bias cut, trouble guaranteed.",
    category: "dresses", color: "purple", tags: ["velvet", "90s", "slip", "goth"], visual_notes: "plum purple crushed velvet slip dress, thin straps, bias cut, midi length", size_on_tag: null },
  { name: "Rainbow Mushroom Tee", description: "Soft cotton tee with a trippy rainbow mushroom print. Grows on you.",
    category: "tops", color: "multi", tags: ["psychedelic", "mushroom", "graphic tee"], visual_notes: "black cotton t-shirt, rainbow mushroom graphic on chest, short sleeves", size_on_tag: null },
];

const hash = (p: PhotoInput) => createHash("sha256").update(p.base64).digest()[0];

/** mode "high" shows the one-tap confirm screen; "low" shows the pick-from-three screen. */
export function simulatedProvider(mode: "high" | "low" = "high"): AiProvider {
  return {
    kind: "simulated",
    draftListing: async (photo) => DRAFTS[hash(photo) % DRAFTS.length],
    matchPhoto: async (_photo, candidates: MatchCandidate[]) => {
      const [first, ...rest] = candidates;
      if (!first) return { best_match_id: null, confidence: 0, reason: "No candidates", alternatives: [] };
      const top = mode === "high" ? 0.93 : 0.61;
      return {
        best_match_id: first.id,
        confidence: top,
        reason: `Simulated: picked the closest ${first.category} by category and color.`,
        alternatives: rest.slice(0, 3).map((c, i) => ({ id: c.id, confidence: Math.max(0.05, top - 0.15 * (i + 1)), reason: "Simulated runner-up." })),
      };
    },
  };
}
