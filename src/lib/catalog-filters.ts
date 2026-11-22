import { CATEGORIES, type Category, type Product } from "./inventory/types";

export const JUST_IN_DAYS = 14;

export interface CatalogFilters {
  category?: Category;
  size?: string;
  color?: string;
  maxPrice?: number;   // dollars
  justIn?: boolean;
  q?: string;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function parseFilters(params: Params): CatalogFilters {
  const category = one(params.category);
  const max = Number(one(params.max));
  return {
    category: CATEGORIES.includes(category as Category) ? (category as Category) : undefined,
    size: one(params.size),
    color: one(params.color)?.toLowerCase(),
    maxPrice: Number.isFinite(max) && max > 0 ? max : undefined,
    justIn: one(params.new) === "1",
    q: one(params.q)?.slice(0, 80),
  };
}

export function isJustIn(p: Pick<Product, "created_at">, now = new Date()): boolean {
  return now.getTime() - new Date(p.created_at).getTime() < JUST_IN_DAYS * 86_400_000;
}

/** Sizes like "XS-6X" or "1X-3X" cover a range; "One size" matches everything. */
export function sizeMatches(productSize: string | null, wanted: string): boolean {
  if (!productSize) return false;
  const norm = (s: string) => s.toUpperCase().trim().replace(/^(\d)XL$/, "$1X");
  const order = ["XS", "S", "M", "L", "XL", "1X", "2X", "3X", "4X", "5X", "6X"];
  const w = norm(wanted);
  const ps = productSize.toUpperCase();
  if (ps === "ONE SIZE") return true;
  const parts = ps.split(/[-/]/).map(norm);
  if (parts.length === 2 && order.includes(parts[0]) && order.includes(parts[1]) && order.includes(w)) {
    const i = order.indexOf(w);
    return i >= order.indexOf(parts[0]) && i <= order.indexOf(parts[1]);
  }
  return parts.includes(w);
}

export function applyFilters(products: Product[], f: CatalogFilters, now = new Date()): Product[] {
  const q = f.q?.toLowerCase();
  return products.filter((p) =>
    (!f.category || p.category === f.category) &&
    (!f.size || sizeMatches(p.size, f.size)) &&
    (!f.color || p.color?.toLowerCase() === f.color) &&
    (!f.maxPrice || p.price_cents <= f.maxPrice * 100) &&
    (!f.justIn || isJustIn(p, now)) &&
    (!q || `${p.name} ${p.description} ${p.tags.join(" ")}`.toLowerCase().includes(q)),
  );
}

export function filtersToQuery(f: CatalogFilters): string {
  const sp = new URLSearchParams();
  if (f.category) sp.set("category", f.category);
  if (f.size) sp.set("size", f.size);
  if (f.color) sp.set("color", f.color);
  if (f.maxPrice) sp.set("max", String(f.maxPrice));
  if (f.justIn) sp.set("new", "1");
  if (f.q) sp.set("q", f.q);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "1X", "2X", "3X", "4X", "5X", "6X"];
export const CATEGORY_LABELS: Record<Category, string> = {
  dresses: "Dresses", tops: "Tops", denim: "Denim", jackets: "Jackets",
  accessories: "Accessories", jewelry: "Jewelry", vintage: "Vintage", shoes: "Shoes",
};
