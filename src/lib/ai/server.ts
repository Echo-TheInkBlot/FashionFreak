import "server-only";
import { claudeProvider } from "./claude";
import { simulatedProvider } from "./simulated";
import { AiError, type AiProvider, type PhotoInput } from "./types";

export const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export function getAi(simMode: "high" | "low" = "high"): AiProvider {
  return hasClaude ? claudeProvider() : simulatedProvider(simMode);
}

const MAX_BYTES = 5 * 1024 * 1024; // the API's per-image limit
const OK = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

/** Reads an uploaded photo for the AI. The staff app shrinks photos in the browser first. */
export async function readPhoto(file: FormDataEntryValue | null): Promise<PhotoInput> {
  if (!(file instanceof File) || file.size === 0) throw new AiError("Take or choose a photo first.", "invalid");
  if (!(OK as readonly string[]).includes(file.type)) throw new AiError("Photos must be JPEG, PNG, WebP or GIF for the AI.", "unreadable");
  if (file.size > MAX_BYTES) throw new AiError("That photo is too big for the AI (5 MB max).", "unreadable");
  return { mediaType: file.type as PhotoInput["mediaType"], base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
}
