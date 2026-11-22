"use client";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/inventory/types";
import { CATEGORY_LABELS, SIZE_OPTIONS, filtersToQuery, type CatalogFilters } from "@/lib/catalog-filters";

const PRICE_OPTIONS = [25, 50, 75, 100];

/** A plain GET form (works without JavaScript); with JS it updates as you change a filter. */
export function ShopFilters({ filters, colors }: { filters: CatalogFilters; colors: string[] }) {
  const router = useRouter();
  const update = (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const f: CatalogFilters = {
      category: (fd.get("category") as CatalogFilters["category"]) || undefined,
      size: (fd.get("size") as string) || undefined,
      color: (fd.get("color") as string) || undefined,
      maxPrice: Number(fd.get("max")) || undefined,
      justIn: fd.get("new") === "1",
      q: (fd.get("q") as string)?.trim() || undefined,
    };
    router.replace(`/shop${filtersToQuery(f)}`, { scroll: false });
  };
  const field = "w-full rounded-2xl border-[3px] border-ink bg-cream px-3 py-2.5 font-semibold";
  const label = "block text-sm font-bold uppercase tracking-wider mb-1.5";

  return (
    <form
      action="/shop"
      method="get"
      onChange={(e) => update(e.currentTarget)}
      onSubmit={(e) => { e.preventDefault(); update(e.currentTarget); }}
      className="h-fit rounded-[28px] border-[3px] border-ink bg-sun p-5 shadow-[5px_5px_0_var(--color-ink)] lg:sticky lg:top-24"
      aria-label="Filter products"
    >
      <details open className="group">
        <summary className="cursor-pointer list-none font-display text-2xl flex justify-between items-center">
          Filters <span aria-hidden className="text-base group-open:rotate-180 transition-transform lg:hidden">▼</span>
        </summary>
        <div className="mt-4 grid gap-4">
          <div>
            <label htmlFor="f-q" className={label}>Search</label>
            <input id="f-q" name="q" type="search" defaultValue={filters.q} placeholder="velvet, mesh, horns…" className={field} />
          </div>
          <div>
            <label htmlFor="f-category" className={label}>Category</label>
            <select id="f-category" name="category" defaultValue={filters.category ?? ""} className={field}>
              <option value="">Everything</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-size" className={label}>Size</label>
            <select id="f-size" name="size" defaultValue={filters.size ?? ""} className={field}>
              <option value="">Any size</option>
              {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-color" className={label}>Color</label>
            <select id="f-color" name="color" defaultValue={filters.color ?? ""} className={field}>
              <option value="">Any color</option>
              {colors.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-max" className={label}>Price</label>
            <select id="f-max" name="max" defaultValue={filters.maxPrice ? String(filters.maxPrice) : ""} className={field}>
              <option value="">Any price</option>
              {PRICE_OPTIONS.map((p) => <option key={p} value={p}>Under ${p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" name="new" value="1" defaultChecked={filters.justIn} className="size-5 accent-ink" />
            Just in (last 2 weeks)
          </label>
          <div className="flex gap-3">
            <button type="submit" className="rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-bold text-sun">Apply</button>
            <button type="button" onClick={(e) => { e.currentTarget.form?.reset(); router.replace("/shop", { scroll: false }); }}
              className="rounded-full border-[3px] border-ink px-4 py-2 font-bold">Clear</button>
          </div>
        </div>
      </details>
    </form>
  );
}
