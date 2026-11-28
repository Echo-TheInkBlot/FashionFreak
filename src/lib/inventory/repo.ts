/**
 * Storage behind the inventory service. Two implementations:
 * - supabaseRepo: production. Stock changes go through the apply_inventory_change() database function.
 * - memoryRepo: demo mode (no Supabase configured). Same rules, kept in server memory, seeded with placeholders.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InventoryEvent, InventoryMethod, Product, ProductStatus, StoreSettings } from "./types";
import { DEFAULT_SETTINGS } from "./types";
import { applyStockChange, InventoryRuleError } from "./rules";
import { demoProducts } from "../demo/demo-products";

export class InventoryError extends Error {
  constructor(message: string, readonly code: "not_found" | "not_allowed" | "rule" | "invalid" | "unknown") {
    super(message);
  }
}

export interface ChangeArgs {
  productId: string;
  change: number;
  method: InventoryMethod;
  confidence: number | null;
  note: string | null;
  setStatus?: ProductStatus;
  staffUser?: string | null;
}

export type NewProduct = Omit<Product, "id" | "created_at" | "updated_at" | "sold_at" | "status"> & { status?: ProductStatus };
export type ProductPatch = Partial<Omit<Product, "id" | "quantity" | "status" | "created_at" | "sold_at">>;

export interface InventoryRepo {
  kind: "supabase" | "memory";
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  getProductBySku(sku: string): Promise<Product | null>;
  getProductBySquareVariation(variationId: string): Promise<Product | null>;
  createProduct(p: NewProduct): Promise<Product>;
  updateProduct(id: string, patch: ProductPatch): Promise<Product>;
  applyChange(a: ChangeArgs): Promise<InventoryEvent>;
  undo(eventId: string): Promise<InventoryEvent>;
  listEvents(limit?: number): Promise<InventoryEvent[]>;
  getSettings(): Promise<StoreSettings>;
  /** Returns false if this webhook event id was already recorded. */
  recordWebhookEvent(e: { event_id: string; type: string; payload: unknown }): Promise<boolean>;
  setWebhookResult(eventId: string, result: string): Promise<void>;
}

// ---------------- Supabase ----------------

function mapError(error: { code?: string; message: string }): InventoryError {
  switch (error.code) {
    case "42501": return new InventoryError("You need to be logged in as staff to do that", "not_allowed");
    case "P0002": return new InventoryError(error.message, "not_found");
    case "P0001": case "23514": return new InventoryError(error.message, "rule");
    default: return new InventoryError(error.message, "unknown");
  }
}

export function supabaseRepo(db: SupabaseClient): InventoryRepo {
  const one = async (q: PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>) => {
    const { data, error } = await q;
    if (error) throw mapError(error);
    return data;
  };
  return {
    kind: "supabase",
    listProducts: async () => (await one(db.from("products").select("*").order("created_at", { ascending: false }))) as Product[],
    getProduct: async (id) => (await one(db.from("products").select("*").eq("id", id).maybeSingle())) as Product | null,
    getProductBySku: async (sku) => (await one(db.from("products").select("*").eq("sku", sku).maybeSingle())) as Product | null,
    getProductBySquareVariation: async (v) =>
      (await one(db.from("products").select("*").eq("square_variation_id", v).maybeSingle())) as Product | null,
    createProduct: async (p) => (await one(db.from("products").insert(p).select("*").single())) as Product,
    updateProduct: async (id, patch) => (await one(db.from("products").update(patch).eq("id", id).select("*").single())) as Product,
    applyChange: async (a) =>
      (await one(db.rpc("apply_inventory_change", {
        p_product_id: a.productId, p_change: a.change, p_method: a.method,
        p_confidence: a.confidence, p_note: a.note, p_set_status: a.setStatus ?? null,
      }))) as InventoryEvent,
    undo: async (eventId) => (await one(db.rpc("undo_inventory_event", { p_event_id: eventId }))) as InventoryEvent,
    listEvents: async (limit = 50) =>
      (await one(db.from("inventory_events").select("*").order("created_at", { ascending: false }).limit(limit))) as InventoryEvent[],
    getSettings: async () => {
      const data = (await one(db.from("store_settings").select("*").single())) as StoreSettings;
      return { ...DEFAULT_SETTINGS, ...data, ai_confidence_threshold: Number(data.ai_confidence_threshold) };
    },
    recordWebhookEvent: async (e) => {
      const { error } = await db.from("square_webhook_events").insert(e);
      if (error?.code === "23505") return false; // duplicate delivery
      if (error) throw mapError(error);
      return true;
    },
    setWebhookResult: async (eventId, result) => {
      await one(db.from("square_webhook_events").update({ result }).eq("event_id", eventId));
    },
  };
}

// ---------------- Memory (demo) ----------------

interface MemoryState { products: Product[]; events: InventoryEvent[]; webhookIds: Set<string>; }

/** Demo data: the seed products, plus a Square sale event for each item that's already sold. */
export function demoState(): MemoryState {
  const products = demoProducts();
  const events: InventoryEvent[] = products
    .filter((p) => p.status === "sold" && p.sold_at)
    .map((p): InventoryEvent => ({
      id: globalThis.crypto.randomUUID(), product_id: p.id, change: -1, quantity_before: 1, quantity_after: 0,
      status_before: "available", status_after: "sold", method: "pos_webhook", confidence: null, note: "Sold on Square",
      staff_user: null, undoes_event_id: null, undone_by_event_id: null, created_at: p.sold_at!,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { products, events, webhookIds: new Set() };
}

export function memoryRepo(state: MemoryState = demoState()): InventoryRepo {
  const find = (id: string) => state.products.find((p) => p.id === id) ?? null;
  const now = () => new Date().toISOString();
  const uid = () => globalThis.crypto.randomUUID();

  return {
    kind: "memory",
    listProducts: async () => [...state.products].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    getProduct: async (id) => find(id),
    getProductBySku: async (sku) => state.products.find((p) => p.sku === sku) ?? null,
    getProductBySquareVariation: async (v) => state.products.find((p) => p.square_variation_id === v) ?? null,
    createProduct: async (p) => {
      if (state.products.some((x) => x.sku === p.sku)) throw new InventoryError(`SKU ${p.sku} already exists`, "rule");
      const t = now();
      const row: Product = { square_item_id: null, square_variation_id: null, square_synced_at: null, square_sync_error: null,
        ...p, id: uid(), status: p.status ?? "available", created_at: t, updated_at: t, sold_at: null };
      state.products.push(row);
      return row;
    },
    updateProduct: async (id, patch) => {
      const p = find(id);
      if (!p) throw new InventoryError("Product not found", "not_found");
      Object.assign(p, patch, { updated_at: now() });
      return p;
    },
    applyChange: async (a) => {
      const p = find(a.productId);
      if (!p) throw new InventoryError("Product not found", "not_found");
      if (a.method === "photo_ai" && a.confidence == null) throw new InventoryError("A photo match needs a confidence", "rule");
      let out;
      try { out = applyStockChange(p, { change: a.change, setStatus: a.setStatus }); }
      catch (e) { throw new InventoryError((e as InventoryRuleError).message, "rule"); }
      const before = { quantity: p.quantity, status: p.status };
      p.quantity = out.quantity;
      p.status = out.status;
      p.sold_at = out.status === "sold" ? (before.status === "sold" ? p.sold_at : now()) : null;
      p.updated_at = now();
      const ev: InventoryEvent = {
        id: uid(), product_id: p.id, change: out.quantity - before.quantity,
        quantity_before: before.quantity, quantity_after: out.quantity, status_before: before.status, status_after: out.status,
        method: a.method, confidence: a.confidence, note: a.note, staff_user: a.staffUser ?? null,
        undoes_event_id: null, undone_by_event_id: null, created_at: now(),
      };
      state.events.unshift(ev);
      return ev;
    },
    undo: async (eventId) => {
      const ev = state.events.find((e) => e.id === eventId);
      if (!ev) throw new InventoryError("Event not found", "not_found");
      if (ev.undone_by_event_id) throw new InventoryError("Event already undone", "rule");
      if (ev.method === "undo") throw new InventoryError("Cannot undo an undo", "rule");
      const p = find(ev.product_id)!;
      if (p.quantity !== ev.quantity_after || p.status !== ev.status_after) {
        throw new InventoryError("Product changed since this event; undo the later change first", "rule");
      }
      p.quantity = ev.quantity_before;
      p.status = ev.status_before;
      if (ev.status_before !== "sold") p.sold_at = null;
      p.updated_at = now();
      const u: InventoryEvent = {
        ...ev, id: uid(), change: ev.quantity_before - ev.quantity_after,
        quantity_before: ev.quantity_after, quantity_after: ev.quantity_before,
        status_before: ev.status_after, status_after: ev.status_before,
        method: "undo", confidence: null, note: "Undo", undoes_event_id: ev.id, undone_by_event_id: null, created_at: now(),
      };
      ev.undone_by_event_id = u.id;
      state.events.unshift(u);
      return u;
    },
    listEvents: async (limit = 50) => state.events.slice(0, limit),
    getSettings: async () => DEFAULT_SETTINGS,
    recordWebhookEvent: async (e) => {
      if (state.webhookIds.has(e.event_id)) return false;
      state.webhookIds.add(e.event_id);
      return true;
    },
    setWebhookResult: async () => {},
  };
}
