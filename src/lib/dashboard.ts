import type { InventoryEvent, Product, StoreSettings } from "./inventory/types";

/** Units sold in a window, net of undos (undone sales are skipped). */
export function unitsSold(events: InventoryEvent[], since: Date): number {
  return events
    .filter((e) => e.method !== "undo" && !e.undone_by_event_id && e.change < 0 && new Date(e.created_at) >= since)
    .reduce((n, e) => n - e.change, 0);
}

export function startOfDayChicago(now = new Date()): Date {
  const d = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const offset = now.getTime() - d.getTime();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset);
}

export function startOfWeekChicago(now = new Date()): Date {
  const day = startOfDayChicago(now);
  const local = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  return new Date(day.getTime() - ((local.getDay() + 6) % 7) * 86_400_000); // weeks start Monday
}

/** Restockable items running low. One-of-a-kind pieces are never "low stock". */
export function lowStock(products: Product[], s: Pick<StoreSettings, "low_stock_threshold">): Product[] {
  return products.filter((p) => p.status === "available" && !p.is_one_of_a_kind && p.quantity <= s.low_stock_threshold);
}
