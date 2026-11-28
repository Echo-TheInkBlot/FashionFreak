import type { Product } from "../inventory/types";
import { SEED_PRODUCTS } from "./seed-data";

/** The seed products as full Product rows, dated relative to now. Used in demo mode. */
export function demoProducts(now = new Date()): Product[] {
  const day = 86_400_000;
  return SEED_PRODUCTS.map((p, i) => {
    const created = new Date(now.getTime() - p.daysAgoAdded * day - i * 60_000).toISOString();
    return {
      id: p.sku, sku: p.sku, name: p.name, description: p.description, category: p.category,
      size: p.size, color: p.color, tags: p.tags, price_cents: Math.round(p.price * 100),
      quantity: p.quantity, status: p.status, is_one_of_a_kind: p.oneOfAKind,
      photos: [`/placeholders/${p.sku}.svg`], ai_description: p.aiNotes,
      created_at: created, updated_at: created,
      sold_at: p.status === "sold" ? new Date(now.getTime() - (p.soldDaysAgo ?? 0) * day - 2 * 3_600_000).toISOString() : null,
    };
  });
}

