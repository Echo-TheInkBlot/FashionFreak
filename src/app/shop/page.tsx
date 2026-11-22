import type { Metadata } from "next";
import { getPublicProducts } from "@/lib/catalog";
import { applyFilters, parseFilters } from "@/lib/catalog-filters";
import { ProductGrid } from "@/components/ProductCard";
import { ShopFilters } from "@/components/ShopFilters";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shop" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const all = await getPublicProducts();
  const products = applyFilters(all, filters);
  const colors = [...new Set(all.map((p) => p.color).filter(Boolean) as string[])].sort();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12">
      <h1 className="drip-title text-[clamp(48px,8vw,96px)]">{filters.justIn ? "Just in" : "The racks"}</h1>
      <p className="mt-4 max-w-xl font-semibold">
        Everything here is in the shop on Oliver right now. Most pieces are one of one, so if you love it, don&apos;t sleep on it.
      </p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <ShopFilters filters={filters} colors={colors} />
        <section aria-label="Products" aria-live="polite">
          <p className="mb-6 font-bold">{products.length} {products.length === 1 ? "piece" : "pieces"}</p>
          {products.length ? (
            <ProductGrid products={products} />
          ) : (
            <div className="rounded-3xl border-[3px] border-ink bg-blush p-8">
              <p className="font-display text-3xl">Nothing matches. Yet.</p>
              <p className="mt-2">New stuff lands every week. Try fewer filters, or come dig through the racks in person.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
