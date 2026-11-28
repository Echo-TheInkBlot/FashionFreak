/**
 * The single entry point for changing stock. Square sales (via webhook), photo matches (after a staff tap),
 * manual adjustments and undo all call these functions. The repo applies the rules and writes the audit log;
 * in production that is one transaction inside the apply_inventory_change() database function.
 *
 * After a change that started on our side, `afterChange` is called so the new count can be pushed to Square.
 * Changes that came from Square are not pushed back.
 */
import type { InventoryEvent, InventoryMethod, Product, ProductStatus } from "./types";
import { InventoryError, type InventoryRepo } from "./repo";
import { normalizeSku } from "./sku";

export { InventoryError } from "./repo";

export type AfterChange = (product: Product, event: InventoryEvent) => Promise<void>;
const noop: AfterChange = async () => {};

export interface RecordSaleInput {
  productId: string;
  method: Exclude<InventoryMethod, "undo">;
  quantity?: number;          // default 1
  confidence?: number | null; // required for photo_ai
  note?: string | null;
  staffUser?: string | null;
}

export async function recordSale(repo: InventoryRepo, input: RecordSaleInput, afterChange: AfterChange = noop): Promise<InventoryEvent> {
  const qty = input.quantity ?? 1;
  if (!Number.isInteger(qty) || qty < 1) throw new InventoryError("Quantity must be at least 1", "invalid");
  if (input.method === "photo_ai" && (input.confidence == null || input.confidence < 0 || input.confidence > 1)) {
    throw new InventoryError("A photo match needs a confidence between 0 and 1", "invalid");
  }
  return change(repo, {
    productId: input.productId, change: -qty, method: input.method,
    confidence: input.confidence ?? null, note: input.note ?? null, staffUser: input.staffUser,
  }, input.method === "pos_webhook" ? noop : afterChange);
}

/** Looks up a scanned or typed SKU and sells one. */
export async function recordSaleBySku(
  repo: InventoryRepo, rawSku: string, method: "barcode" | "manual" = "barcode", afterChange: AfterChange = noop,
): Promise<{ event: InventoryEvent; product: Product }> {
  const product = await findBySku(repo, rawSku);
  const event = await recordSale(repo, { productId: product.id, method }, afterChange);
  return { event, product };
}

export async function findBySku(repo: InventoryRepo, rawSku: string): Promise<Product> {
  const sku = normalizeSku(rawSku);
  if (!sku) throw new InventoryError(`"${rawSku}" isn't a Fashion Freak SKU`, "invalid");
  const product = await repo.getProductBySku(sku);
  if (!product) throw new InventoryError(`No item with SKU ${sku}`, "not_found");
  return product;
}

export async function adjustStock(
  repo: InventoryRepo,
  input: { productId: string; change: number; setStatus?: ProductStatus; note?: string | null; staffUser?: string | null },
  afterChange: AfterChange = noop,
): Promise<InventoryEvent> {
  if (!Number.isInteger(input.change)) throw new InventoryError("Change must be a whole number", "invalid");
  return change(repo, { ...input, method: "manual", confidence: null, note: input.note ?? null }, afterChange);
}

export async function undoEvent(repo: InventoryRepo, eventId: string, afterChange: AfterChange = noop): Promise<InventoryEvent> {
  const ev = await repo.undo(eventId);
  const p = await repo.getProduct(ev.product_id);
  if (p) await afterChange(p, ev);
  return ev;
}

async function change(
  repo: InventoryRepo,
  a: { productId: string; change: number; method: InventoryMethod; confidence: number | null; note: string | null; setStatus?: ProductStatus; staffUser?: string | null },
  afterChange: AfterChange,
): Promise<InventoryEvent> {
  const ev = await repo.applyChange(a);
  const p = await repo.getProduct(a.productId);
  if (p) await afterChange(p, ev);
  return ev;
}
