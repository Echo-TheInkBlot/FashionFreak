import "server-only";
import { DEFAULT_SETTINGS, type Product, type StoreSettings } from "./inventory/types";
import { displayStatus } from "./inventory/rules";
import { SEED_PRODUCTS } from "./demo/seed-data";

/** True when Supabase env vars are set. Without them the site runs on built-in demo data. */
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function demoProducts(now = new Date()): Product[] {
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

async function db() {
  const { supabaseServer } = await import("./supabase/server");
  return supabaseServer();
}

export async function getSettings(): Promise<StoreSettings> {
  if (!hasSupabase) return DEFAULT_SETTINGS;
  const { data } = await (await db()).from("store_settings").select("*").single();
  return data ? { ...DEFAULT_SETTINGS, ...data, ai_confidence_threshold: Number(data.ai_confidence_threshold) } : DEFAULT_SETTINGS;
}

/** Everything the public may see: available items plus recent sales. RLS enforces the same rule in Supabase. */
export async function getPublicProducts(): Promise<Product[]> {
  const settings = await getSettings();
  let rows: Product[];
  if (!hasSupabase) rows = demoProducts();
  else {
    const { data, error } = await (await db()).from("products").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    rows = data as Product[];
  }
  return rows
    .filter((p) => displayStatus(p, settings) !== null)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getPublicProduct(sku: string): Promise<Product | null> {
  const all = await getPublicProducts();
  return all.find((p) => p.sku === sku.toUpperCase()) ?? null;
}
