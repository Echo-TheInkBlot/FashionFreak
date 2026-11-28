"use server";
import { revalidatePath } from "next/cache";
import { getRepo, getStaff } from "@/lib/inventory/server-repo";
import { InventoryError, recordSale } from "@/lib/inventory/service";
import { afterChangeFor } from "@/lib/square/server";
import { getAi, readPhoto } from "@/lib/ai/server";
import { lookupByPhoto } from "@/lib/ai/lookup";
import { isCategory, type MatchUi } from "@/lib/ai/rules";
import type { ListingDraft } from "@/lib/ai/types";
import { formatPrice } from "@/lib/inventory/rules";
import type { ActionResult } from "./actions";

const simMode = (fd: FormData) => (fd.get("sim") === "low" ? "low" : "high");
const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

async function staffOrThrow() {
  const staff = await getStaff();
  if (!staff) throw new InventoryError("Please log in as staff", "not_allowed");
  return staff;
}

export interface DraftResult { ok: boolean; message: string; draft?: ListingDraft; simulated?: boolean }

/** Photo in, listing draft out. Nothing is saved: the draft fills the form for staff to edit. */
export async function draftListingAction(fd: FormData): Promise<DraftResult> {
  try {
    await staffOrThrow();
    const ai = getAi(simMode(fd));
    const draft = await ai.draftListing(await readPhoto(fd.get("photo")));
    return { ok: true, message: ai.kind === "simulated" ? "Simulated draft (no AI key set)." : "Drafted from the photo. Check it over.", draft, simulated: ai.kind === "simulated" };
  } catch (e) {
    return { ok: false, message: message(e) };
  }
}

export interface MatchCard {
  id: string; sku: string; name: string; photo: string | null; price: string; size: string | null; color: string | null; quantity: number;
}
export interface LookupActionResult {
  ok: boolean; message: string;
  ui?: MatchUi; threshold?: number; simulated?: boolean; items?: Record<string, MatchCard>;
}

/** Photo in, likely matches out. Read only: this never changes stock. */
export async function photoLookupAction(fd: FormData): Promise<LookupActionResult> {
  try {
    await staffOrThrow();
    const cat = fd.get("category");
    const res = await lookupByPhoto(await getRepo(), getAi(simMode(fd)), await readPhoto(fd.get("photo")), {
      category: isCategory(cat) ? cat : null,
    });
    const items: Record<string, MatchCard> = {};
    for (const p of res.candidates) {
      items[p.id] = { id: p.id, sku: p.sku, name: p.name, photo: p.photos[0] ?? null, price: formatPrice(p.price_cents), size: p.size, color: p.color, quantity: p.quantity };
    }
    return { ok: true, message: "", ui: res.ui, threshold: res.threshold, simulated: res.simulated, items };
  } catch (e) {
    return { ok: false, message: message(e) };
  }
}

/** The staff tap. Only this records a photo sale, with the AI's confidence kept in the event log. */
export async function confirmPhotoSaleAction(productId: string, confidence: number): Promise<ActionResult> {
  try {
    const staff = await staffOrThrow();
    const repo = await getRepo();
    const c = Math.min(1, Math.max(0, Number(confidence) || 0));
    const ev = await recordSale(repo, {
      productId, method: "photo_ai", confidence: c, staffUser: staff.id,
      note: `Sold by photo, staff confirmed (AI ${Math.round(c * 100)}%)`,
    }, afterChangeFor(repo));
    const p = await repo.getProduct(productId);
    revalidatePath("/admin", "layout"); revalidatePath("/"); revalidatePath("/shop");
    if (p) revalidatePath(`/shop/${p.sku}`);
    return { ok: true, message: `Sold: ${p?.name ?? "item"}`, eventId: ev.id,
      product: p ? { id: p.id, quantity: p.quantity, status: p.status, sold_at: p.sold_at } : undefined };
  } catch (e) {
    return { ok: false, message: message(e) };
  }
}
