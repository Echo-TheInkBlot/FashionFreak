/**
 * Minimal Square REST client (Catalog + Inventory). Plain fetch keeps it small and easy to mock in tests.
 * Docs: https://developer.squareup.com/reference/square
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Product } from "../inventory/types";
import { squareBaseUrl, type SquareConfig } from "./config";

export class SquareError extends Error {
  constructor(message: string, readonly status: number, readonly details?: unknown) { super(message); }
}

type Fetch = typeof fetch;

export function squareClient(cfg: SquareConfig, fetchImpl: Fetch = fetch) {
  async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(`${squareBaseUrl(cfg)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Square-Version": cfg.apiVersion,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as { errors?: { detail?: string; code?: string }[] } & T;
    if (!res.ok || json.errors?.length) {
      throw new SquareError(json.errors?.map((e) => e.detail ?? e.code).join("; ") || `Square API error ${res.status}`, res.status, json.errors);
    }
    return json;
  }

  return {
    /** Creates or updates the Square item for a product. Returns the Square ids to store on the product. */
    async upsertItem(p: Product): Promise<{ itemId: string; variationId: string }> {
      let version: number | undefined;
      let variationVersion: number | undefined;
      if (p.square_item_id) {
        const existing = await call<{ object: { version: number; item_data?: { variations?: { id: string; version: number }[] } } }>(
          "GET", `/v2/catalog/object/${encodeURIComponent(p.square_item_id)}`);
        version = existing.object.version;
        variationVersion = existing.object.item_data?.variations?.find((v) => v.id === p.square_variation_id)?.version;
      }
      const res = await call<{ catalog_object: { id: string; item_data: { variations: { id: string }[] } } }>("POST", "/v2/catalog/object", {
        idempotency_key: crypto.randomUUID(),
        object: {
          type: "ITEM",
          id: p.square_item_id ?? `#item-${p.sku}`,
          version,
          item_data: {
            name: p.name,
            description: p.description.slice(0, 4000),
            variations: [{
              type: "ITEM_VARIATION",
              id: p.square_variation_id ?? `#var-${p.sku}`,
              version: variationVersion,
              item_variation_data: {
                name: p.size ? `Size ${p.size}` : "Regular",
                sku: p.sku,                         // scanning the printed label in Square POS finds this
                pricing_type: "FIXED_PRICING",
                price_money: { amount: p.price_cents, currency: "USD" },
                track_inventory: true,
              },
            }],
          },
        },
      });
      return { itemId: res.catalog_object.id, variationId: res.catalog_object.item_data.variations[0].id };
    },

    /** Sets Square's in-stock count to match ours. */
    async setCount(variationId: string, quantity: number): Promise<void> {
      await call("POST", "/v2/inventory/changes/batch-create", {
        idempotency_key: crypto.randomUUID(),
        changes: [{
          type: "PHYSICAL_COUNT",
          physical_count: {
            catalog_object_id: variationId, location_id: cfg.locationId, state: "IN_STOCK",
            quantity: String(quantity), occurred_at: new Date().toISOString(),
          },
        }],
      });
    },

    /** In-stock counts for many variations at our location. */
    async getCounts(variationIds: string[]): Promise<Map<string, number>> {
      const out = new Map<string, number>();
      for (let i = 0; i < variationIds.length; i += 100) {
        const res = await call<{ counts?: { catalog_object_id: string; state: string; quantity: string }[] }>(
          "POST", "/v2/inventory/counts/batch-retrieve",
          { catalog_object_ids: variationIds.slice(i, i + 100), location_ids: [cfg.locationId], states: ["IN_STOCK"] });
        for (const c of res.counts ?? []) out.set(c.catalog_object_id, Math.max(0, Math.floor(Number(c.quantity))));
      }
      return out;
    },
  };
}

export type SquareClient = ReturnType<typeof squareClient>;

/** Square signs webhooks with HMAC-SHA256 over (notification URL + raw body), base64-encoded. */
export function verifySquareSignature(rawBody: string, signature: string | null, cfg: Pick<SquareConfig, "webhookSignatureKey" | "webhookUrl">): boolean {
  if (!signature || !cfg.webhookSignatureKey || !cfg.webhookUrl) return false;
  const expected = createHmac("sha256", cfg.webhookSignatureKey).update(cfg.webhookUrl + rawBody).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
