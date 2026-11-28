import { getRepo } from "@/lib/inventory/server-repo";
import { formatPrice } from "@/lib/inventory/rules";
import { isJustIn } from "@/lib/catalog-filters";

export const metadata = { title: "Labels" };

export default async function Labels({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const { ids } = await searchParams;
  const preselected = new Set(ids?.split(",") ?? []);
  const items = (await (await getRepo()).listProducts()).filter((p) => p.status === "available");
  const checked = (id: string, createdAt: string) => (preselected.size ? preselected.has(id) : isJustIn({ created_at: createdAt }));
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-5xl">Barcode labels</h1>
      <p className="max-w-prose font-semibold">
        Prints on standard Avery 5160 / 8160 sheets (30 per page, 1&quot; × 2⅝&quot;). Each label has a barcode of the item&apos;s SKU,
        so scanning it on the Square iPad rings up the right item. Items added in the last two weeks are ticked to start.
      </p>
      <form action="/admin/labels/pdf" method="get" target="_blank" className="grid gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div><label htmlFor="copies" className="mb-1 block text-sm font-bold uppercase tracking-wider">Copies of each</label>
            <input id="copies" name="copies" type="number" min={1} max={10} defaultValue={1} className="w-24 rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 font-bold" /></div>
          <button className="rounded-2xl border-[3px] border-ink bg-sun px-5 py-3 font-bold shadow-[3px_3px_0_var(--color-ink)]">Make label sheet (PDF)</button>
        </div>
        <fieldset className="rounded-3xl border-[3px] border-ink bg-cream p-4">
          <legend className="px-2 font-bold">Items</legend>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((p) => (
              <li key={p.id}><label className="flex items-center gap-3 font-semibold">
                <input type="checkbox" name="id" value={p.id} defaultChecked={checked(p.id, p.created_at)} className="size-5 accent-ink" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="font-mono text-xs">{p.sku}</span><span className="tabular-nums">{formatPrice(p.price_cents)}</span>
              </label></li>
            ))}
          </ul>
        </fieldset>
      </form>
    </div>
  );
}
