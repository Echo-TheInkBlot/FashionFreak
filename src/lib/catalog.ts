import "server-only";
import type { Product, StoreSettings } from "./inventory/types";
import { displayStatus } from "./inventory/rules";
import { getRepo } from "./inventory/server-repo";

export { hasSupabase } from "./inventory/server-repo";

export async function getSettings(): Promise<StoreSettings> {
  return (await getRepo()).getSettings();
}

/** Everything the public may see: available items plus recent sales. RLS enforces the same rule in Supabase. */
export async function getPublicProducts(): Promise<Product[]> {
  const repo = await getRepo();
  const [settings, rows] = await Promise.all([repo.getSettings(), repo.listProducts()]);
  return rows
    .filter((p) => displayStatus(p, settings) !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getPublicProduct(sku: string): Promise<Product | null> {
  const all = await getPublicProducts();
  return all.find((p) => p.sku === sku.toUpperCase()) ?? null;
}
