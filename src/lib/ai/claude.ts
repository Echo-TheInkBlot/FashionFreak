import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  AiError, ListingDraftSchema, MatchSchema,
  type AiProvider, type MatchCandidate, type PhotoInput,
} from "./types";

// Override with ANTHROPIC_MODEL if the shop ever wants a different model.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

const SHOP_VOICE =
  "You help staff at Fashion Freak, an all-alternative thrift boutique in Wichita, KS " +
  "(goth, hippie, rave, festival, costume, vintage; sizes XS to 6XL). " +
  "The shop's voice is cheeky and flirty with innuendo, never explicit.";

type ImageBlock = Anthropic.Beta.BetaImageBlockParam;

const photoBlock = (p: PhotoInput): ImageBlock => ({
  type: "image",
  source: { type: "base64", media_type: p.mediaType, data: p.base64 },
});

/** Candidate photos can be data URLs (demo uploads), https URLs (Supabase Storage) or SVG placeholders (skipped). */
function candidatePhotoBlock(src: string | null): ImageBlock | null {
  if (!src) return null;
  const data = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(src);
  if (data) return { type: "image", source: { type: "base64", media_type: data[1] as PhotoInput["mediaType"], data: data[2] } };
  if (/^https:\/\/.+\.(?:jpe?g|png|webp|gif)(?:\?.*)?$/i.test(src)) return { type: "image", source: { type: "url", url: src } };
  return null;
}

function explain(e: unknown): never {
  if (e instanceof AiError) throw e;
  if (e instanceof Anthropic.AuthenticationError) throw new AiError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", "unavailable");
  if (e instanceof Anthropic.RateLimitError) throw new AiError("The AI is busy right now. Try again in a minute.", "unavailable");
  if (e instanceof Anthropic.BadRequestError) throw new AiError("The AI couldn't read that photo. Try a clearer JPEG or PNG.", "unreadable");
  if (e instanceof Anthropic.APIError) throw new AiError(`The AI service had a problem (${e.status ?? "network"}). Try again.`, "unavailable");
  throw e;
}

export function claudeProvider(client = new Anthropic()): AiProvider {
  // Every call: structured JSON output, and a server-side fallback model if the main model declines.
  async function ask<T>(schema: Parameters<typeof betaZodOutputFormat>[0], effort: "low" | "medium", content: Anthropic.Beta.BetaContentBlockParam[]) {
    try {
      const res = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SHOP_VOICE,
        output_config: { effort, format: betaZodOutputFormat(schema) },
        messages: [{ role: "user", content }],
      });
      if (res.stop_reason === "refusal") throw new AiError("The AI declined this photo. Fill the details in by hand.", "refused");
      if (res.stop_reason === "max_tokens" || res.parsed_output == null) throw new AiError("The AI's answer came back incomplete. Try again.", "invalid");
      return res.parsed_output as T;
    } catch (e) {
      explain(e);
    }
  }

  return {
    kind: "claude",
    draftListing: (photo) =>
      ask(ListingDraftSchema, "low", [
        photoBlock(photo),
        { type: "text", text:
          "Draft a shop listing for the clothing or accessory in this photo. Describe only what you can see; " +
          "do not guess brand, size or price. If there are several items, describe the main one." },
      ]),

    matchPhoto: (photo, candidates: MatchCandidate[]) => {
      const content: Anthropic.Beta.BetaContentBlockParam[] = [
        { type: "text", text: "PHOTO TO IDENTIFY (taken at the register):" },
        photoBlock(photo),
        { type: "text", text:
          "CANDIDATE ITEMS from the shop's inventory. Each has an id, details, and a listing photo when one exists." },
      ];
      for (const c of candidates) {
        content.push({ type: "text", text:
          `id: ${c.id}\nsku: ${c.sku}\nname: ${c.name}\ncategory: ${c.category}\ncolor: ${c.color ?? "?"}\nsize: ${c.size ?? "?"}\nnotes: ${c.notes}` });
        const img = candidatePhotoBlock(c.photo);
        if (img) content.push(img);
      }
      content.push({ type: "text", text:
        "Which candidate is the SAME physical item as the photo to identify? Thrift items are one of a kind, so similar is not enough: " +
        "compare print, color, material, cut and details. Confidence is your probability that best_match_id is that exact item. " +
        "If none match, set best_match_id to null and confidence to 0. Only use ids from the list above." });
      return ask(MatchSchema, "medium", content);
    },
  };
}
