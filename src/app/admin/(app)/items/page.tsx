import Link from "next/link";
import { getRepo } from "@/lib/inventory/server-repo";
import { formatPrice } from "@/lib/inventory/rules";
import type { ProductStatus } from "@/lib/inventory/types";

export const metadata = { title: "Items" };

const STATUS_STYLE: Record<ProductStatus, string> = { available: "bg-violet text-cream", sold: "bg-ink text-sun", hidden: "bg-cream" };

export default async function Items({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q = "", status = "" } = await searchParams;
  const all = await (await getRepo()).listProducts();
  const needle = q.trim().toLowerCase();
  const items = all.filter((p) =>
    (!status || p.status === status) &&
    (!needle || `${p.sku} ${p.name} ${p.tags.join(" ")} ${p.color ?? ""}`.toLowerCase().includes(needle)));
  const field = "rounded-2xl border-[3px] border-ink bg-cream px-3 py-2 font-semibold";
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-5xl">Items</h1>
        <Link href="/admin/items/new" className="rounded-2xl border-[3px] border-ink bg-sun px-5 py-3 font-bold shadow-[3px_3px_0_var(--color-ink)]">+ Add item</Link>
      </div>
      <form className="flex flex-wrap gap-3" role="search">
        <label className="sr-only" htmlFor="i-q">Search items</label>
        <input id="i-q" name="q" defaultValue={q} placeholder="Name, SKU, tag…" className={`${field} min-w-0 flex-1`} />
        <label className="sr-only" htmlFor="i-status">Status</label>
        <select id="i-status" name="status" defaultValue={status} className={field}>
          <option value="">All</option><option value="available">Available</option><option value="sold">Sold</option><option value="hidden">Hidden</option>
        </select>
        <button className="rounded-2xl border-[3px] border-ink bg-ink px-4 py-2 font-bold text-sun">Search</button>
      </form>
      <p className="font-bold">{items.length} items</p>
      <div className="overflow-x-auto rounded-3xl border-[3px] border-ink bg-cream">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-ink text-sun text-sm uppercase tracking-wider">
            <tr><th className="p-3">Item</th><th className="p-3">SKU</th><th className="p-3 text-right">Price</th><th className="p-3 text-right">Qty</th><th className="p-3">Status</th><th className="p-3">Square</th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t-2 border-ink/15">
                <td className="p-3"><Link href={`/admin/items/${p.id}`} className="flex items-center gap-3 font-bold underline-offset-2 hover:underline">
                  <img src={p.photos[0] ?? "/brand/logo-160.webp"} alt="" width={36} height={45} className="h-11 w-9 rounded-md border-2 border-ink object-cover" />{p.name}</Link></td>
                <td className="p-3 font-mono text-sm">{p.sku}</td>
                <td className="p-3 text-right tabular-nums">{formatPrice(p.price_cents)}</td>
                <td className="p-3 text-right tabular-nums">{p.quantity}</td>
                <td className="p-3"><span className={`rounded-full border-2 border-ink px-2 py-0.5 text-xs font-bold uppercase ${STATUS_STYLE[p.status]}`}>{p.status}</span></td>
                <td className="p-3 text-sm font-semibold">{p.square_sync_error ? <span className="text-lip">Sync failed</span> : p.square_variation_id ? "Linked" : "Not yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
