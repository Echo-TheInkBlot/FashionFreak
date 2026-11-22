/**
 * The single entry point for changing stock. Barcode scans, AI photo matches (after a staff tap),
 * manual adjustments and, later, a POS webhook all call these functions, which call the
 * apply_inventory_change() database function. That function locks the row, applies the rules,
 * and writes the audit log in one transaction.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryEvent, InventoryMethod, Product, ProductStatus } from "./types";
import { normalizeSku } from "./sku";

export class InventoryError extends Error {
  constructor(message: string, readonly code: "not_found" | "not_allowed" | "rule" | "invalid" | "unknown") {
    super(message);
  }
}

export interface RecordSaleInput {
  productId: string;
  method: Exclude<InventoryMethod, "undo">;
  quantity?: number;          // default 1
  confidence?: number | null; // required for photo_ai
  note?: string | null;
}

export async function recordSale(db: SupabaseClient, input: RecordSaleInput): Promise<InventoryEvent> {
  const qty = input.quantity ?? 1;
  if (!Number.isInteger(qty) || qty < 1) throw new InventoryError("Quantity must be at least 1", "invalid");
  if (input.method === "photo_ai" && (input.confidence == null || input.confidence < 0 || input.confidence > 1)) {
    throw new InventoryError("A photo match needs a confidence between 0 and 1", "invalid");
  }
  return applyChange(db, {
    productId: input.productId, change: -qty, method: input.method,
    confidence: input.confidence ?? null, note: input.note ?? null,
  });
}

/** Looks up a scanned or typed SKU and sells one. */
export async function recordSaleBySku(
  db: SupabaseClient, rawSku: string, method: "barcode" | "manual" | "pos_webhook" = "barcode",
): Promise<{ event: InventoryEvent; product: Product }> {
  const sku = normalizeSku(rawSku);
  if (!sku) throw new InventoryError(`"${rawSku}" isn't a Fashion Freak SKU`, "invalid");
  const { data: product, error } = await db.from("products").select("*").eq("sku", sku).maybeSingle();
  if (error) throw new InventoryError(error.message, "unknown");
  if (!product) throw new InventoryError(`No item with SKU ${sku}`, "not_found");
  const event = await recordSale(db, { productId: product.id, method });
  return { event, product: product as Product };
}

export async function adjustStock(
  db: SupabaseClient,
  input: { productId: string; change: number; setStatus?: ProductStatus; note?: string | null },
): Promise<InventoryEvent> {
  return applyChange(db, { ...input, method: "manual", confidence: null, note: input.note ?? null });
}

export async function undoEvent(db: SupabaseClient, eventId: string): Promise<InventoryEvent> {
  const { data, error } = await db.rpc("undo_inventory_event", { p_event_id: eventId });
  if (error) throw mapError(error);
  return data as InventoryEvent;
}

async function applyChange(
  db: SupabaseClient,
  a: { productId: string; change: number; method: InventoryMethod; confidence: number | null; note: string | null; setStatus?: ProductStatus },
): Promise<InventoryEvent> {
  const { data, error } = await db.rpc("apply_inventory_change", {
    p_product_id: a.productId,
    p_change: a.change,
    p_method: a.method,
    p_confidence: a.confidence,
    p_note: a.note,
    p_set_status: a.setStatus ?? null,
  });
  if (error) throw mapError(error);
  return data as InventoryEvent;
}

function mapError(error: { code?: string; message: string }): InventoryError {
  switch (error.code) {
    case "42501": return new InventoryError("You need to be logged in as staff to do that", "not_allowed");
    case "P0002": return new InventoryError(error.message, "not_found");
    case "P0001": case "23514": return new InventoryError(error.message, "rule");
    default: return new InventoryError(error.message, "unknown");
  }
}
