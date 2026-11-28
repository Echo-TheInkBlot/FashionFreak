/**
 * Keeps our inventory and Square's in step.
 *
 * Square -> us: Square sends `inventory.count.updated` whenever a sale, refund or count change happens on the iPad.
 *   We compare Square's count with ours and record the difference as a sale (count went down) or a return
 *   (count went up). Because we compare counts instead of replaying events, a duplicate or late webhook is harmless.
 * Us -> Square: when staff add an item or change stock in our app, we push the item and its count to Square.
 *   Square then sends a webhook with the count we already have, which is a no-op.
 */
import type { InventoryRepo } from "../inventory/repo";
import { InventoryError } from "../inventory/repo";
import { recordSale, type AfterChange } from "../inventory/service";
import type { Product } from "../inventory/types";
import type { SquareClient } from "./client";

export interface SquareCount { variationId: string; quantity: number; locationId: string; state?: string }

export async function applySquareCount(repo: InventoryRepo, c: SquareCount, ourLocationId: string): Promise<string> {
  if (c.locationId !== ourLocationId) return "ignored: other location";
  if (c.state && c.state !== "IN_STOCK") return `ignored: state ${c.state}`;
  const p = await repo.getProductBySquareVariation(c.variationId);
  if (!p) return "ignored: not a Fashion Freak item";
  const delta = c.quantity - p.quantity;
  if (delta === 0) return `no change (${p.sku})`;
  if (p.status === "hidden") return `ignored: ${p.sku} is hidden on the site`;
  try {
    if (delta < 0) {
      await recordSale(repo, { productId: p.id, method: "pos_webhook", quantity: -delta, note: "Sold on Square" });
      return `sold ${-delta} × ${p.sku}`;
    }
    const allowed = p.is_one_of_a_kind ? Math.min(delta, 1 - p.quantity) : delta;
    if (allowed <= 0) return `ignored: ${p.sku} is one of a kind and already in stock`;
    await repo.applyChange({ productId: p.id, change: allowed, method: "pos_webhook", confidence: null, note: "Returned or recounted on Square" });
    return `restocked ${allowed} × ${p.sku}`;
  } catch (e) {
    if (e instanceof InventoryError) return `error: ${e.message}`;
    throw e;
  }
}

interface SquareWebhookEvent {
  event_id?: string;
  type?: string;
  data?: { object?: { inventory_counts?: { catalog_object_id: string; location_id: string; quantity: string; state: string }[] } };
}

export async function handleSquareWebhook(repo: InventoryRepo, event: SquareWebhookEvent, ourLocationId: string): Promise<string[]> {
  if (!event.event_id || !event.type) return ["ignored: malformed event"];
  const fresh = await repo.recordWebhookEvent({ event_id: event.event_id, type: event.type, payload: event });
  if (!fresh) return ["ignored: duplicate delivery"];
  let results: string[];
  if (event.type !== "inventory.count.updated") {
    results = [`ignored: ${event.type}`];
  } else {
    results = [];
    for (const c of event.data?.object?.inventory_counts ?? []) {
      results.push(await applySquareCount(repo, {
        variationId: c.catalog_object_id, locationId: c.location_id,
        quantity: Math.max(0, Math.floor(Number(c.quantity))), state: c.state,
      }, ourLocationId));
    }
  }
  await repo.setWebhookResult(event.event_id, results.join("; "));
  return results;
}

/** Creates/updates the product in Square's item library and sets its stock count there. */
export async function pushProductToSquare(repo: InventoryRepo, square: SquareClient, p: Product): Promise<Product> {
  try {
    const ids = await square.upsertItem(p);
    await square.setCount(ids.variationId, p.status === "hidden" ? 0 : p.quantity);
    return await repo.updateProduct(p.id, {
      square_item_id: ids.itemId, square_variation_id: ids.variationId,
      square_synced_at: new Date().toISOString(), square_sync_error: null,
    });
  } catch (e) {
    return await repo.updateProduct(p.id, { square_sync_error: (e as Error).message });
  }
}

/** After a staff change in our app, push the new count to Square. Never throws: the sale is already recorded. */
export function squareAfterChange(repo: InventoryRepo, square: SquareClient | null): AfterChange {
  return async (p) => {
    if (!square || !p.square_variation_id) return;
    try {
      await square.setCount(p.square_variation_id, p.status === "hidden" ? 0 : p.quantity);
      await repo.updateProduct(p.id, { square_synced_at: new Date().toISOString(), square_sync_error: null });
    } catch (e) {
      await repo.updateProduct(p.id, { square_sync_error: `Couldn't update Square: ${(e as Error).message}` });
    }
  };
}

/** Safety net (run nightly, or from the admin): pull Square's counts and apply any differences. */
export async function reconcileWithSquare(repo: InventoryRepo, square: SquareClient, ourLocationId: string): Promise<string[]> {
  const linked = (await repo.listProducts()).filter((p) => p.square_variation_id);
  const counts = await square.getCounts(linked.map((p) => p.square_variation_id!));
  const results: string[] = [];
  for (const p of linked) {
    const q = counts.get(p.square_variation_id!) ?? 0;
    results.push(await applySquareCount(repo, { variationId: p.square_variation_id!, quantity: q, locationId: ourLocationId }, ourLocationId));
  }
  return results.filter((r) => !r.startsWith("no change"));
}
