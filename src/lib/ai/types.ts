import { z } from "zod";
import { CATEGORIES } from "../inventory/types";

export const COLORS = [
  "black", "white", "cream", "gray", "silver", "gold", "brown", "tan", "red", "pink",
  "orange", "yellow", "green", "blue", "purple", "multi",
] as const;

/** A photo sent from the staff app, already shrunk in the browser. */
export interface PhotoInput {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  base64: string;
}

/** Listing draft from one photo. Staff edit every field before saving. */
export const ListingDraftSchema = z.object({
  name: z.string().describe("Shop-style item name, 2 to 6 words, title case, playful but not explicit"),
  description: z.string().describe("One or two sentences in the shop's cheeky, flirty voice. Describe only what is visible."),
  category: z.enum(CATEGORIES),
  color: z.enum(COLORS).describe("Main color. Use multi for prints with several strong colors."),
  tags: z.array(z.string()).describe("3 to 6 short lowercase style tags, like 70s, goth, crochet, festival"),
  visual_notes: z.string().describe("Plain factual description for matching later photos: garment type, color, material, print, details, length"),
  size_on_tag: z.string().nullable().describe("Size only if a size tag is clearly readable in the photo, otherwise null"),
});
export type ListingDraft = z.infer<typeof ListingDraftSchema>;

/** Model output when matching a photo to candidate items. Ids are checked against the candidates afterwards. */
export const MatchSchema = z.object({
  best_match_id: z.string().nullable().describe("id of the candidate that is the same physical item, or null if none is"),
  confidence: z.number().describe("0 to 1: how sure you are that best_match_id is the same item"),
  reason: z.string().describe("One short sentence a shop clerk can check by eye"),
  alternatives: z.array(z.object({
    id: z.string(),
    confidence: z.number(),
    reason: z.string(),
  })).describe("Up to 3 next most likely candidates, most likely first, not including best_match_id"),
});

/** A candidate sent to the model alongside the photo. */
export interface MatchCandidate {
  id: string;
  sku: string;
  name: string;
  category: string;
  color: string | null;
  size: string | null;
  notes: string;
  photo: string | null;
}

export interface AiProvider {
  /** "claude" for real calls; "simulated" when no API key is set (demo only, never presented as real). */
  kind: "claude" | "simulated";
  draftListing(photo: PhotoInput): Promise<ListingDraft>;
  matchPhoto(photo: PhotoInput, candidates: MatchCandidate[]): Promise<z.infer<typeof MatchSchema>>;
}

export class AiError extends Error {
  constructor(message: string, public code: "refused" | "unreadable" | "unavailable" | "invalid") {
    super(message);
    this.name = "AiError";
  }
}
