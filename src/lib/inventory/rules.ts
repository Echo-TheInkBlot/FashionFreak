import type { Product, ProductStatus, StoreSettings } from "./types";

/**
 * Pure mirror of apply_inventory_change() in the database, so the UI can predict
 * the result (and tests can pin down the rules). The database is still the source of truth.
 */
export interface StockChange {
  change: number;               // -1 = sold one, +n = restock
  setStatus?: ProductStatus;    // explicit status, e.g. "hidden"
}

export interface StockOutcome {
  quantity: number;
  status: ProductStatus;
  becameSold: boolean;
}

export class InventoryRuleError extends Error {}

export function applyStockChange(
  product: Pick<Product, "quantity" | "status" | "is_one_of_a_kind" | "sku">,
  { change, setStatus }: StockChange,
): StockOutcome {
  if (!Number.isInteger(change)) throw new InventoryRuleError("Change must be a whole number");
  if (change < 0 && product.status !== "available") {
    throw new InventoryRuleError(`${product.sku} is ${product.status} and cannot be sold`);
  }
  let quantity = product.quantity + change;
  if (quantity < 0) throw new InventoryRuleError(`Not enough stock for ${product.sku}`);
  if (product.is_one_of_a_kind && quantity > 1) {
    throw new InventoryRuleError(`${product.sku} is one-of-a-kind; quantity cannot exceed 1`);
  }
  let status: ProductStatus =
    setStatus ??
    (quantity === 0 && product.status === "available"
      ? "sold"
      : quantity > 0 && product.status === "sold"
        ? "available"
        : product.status);
  if (status === "sold") quantity = 0;
  return { quantity, status, becameSold: status === "sold" && product.status !== "sold" };
}

export type DisplayStatus = "in_stock" | "only_one_left" | "sold";

/** What the storefront badge says. Returns null if the product shouldn't be shown publicly. */
export function displayStatus(
  product: Pick<Product, "quantity" | "status" | "sold_at">,
  settings: Pick<StoreSettings, "sold_visible_days">,
  now: Date = new Date(),
): DisplayStatus | null {
  if (product.status === "hidden") return null;
  if (product.status === "sold") {
    if (!product.sold_at) return null;
    const ageMs = now.getTime() - new Date(product.sold_at).getTime();
    return ageMs < settings.sold_visible_days * 86_400_000 ? "sold" : null;
  }
  if (product.quantity <= 0) return "sold";
  return product.quantity === 1 ? "only_one_left" : "in_stock";
}

export function formatPrice(cents: number): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(cents / 100);
}
