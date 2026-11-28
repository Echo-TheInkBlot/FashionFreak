import Link from "next/link";
import { getRepo } from "@/lib/inventory/server-repo";
import { lowStock, startOfDayChicago, startOfWeekChicago, unitsSold } from "@/lib/dashboard";
import { formatPrice } from "@/lib/inventory/rules";
import { EventList } from "@/components/admin/EventList";
import { SQUARE } from "@/lib/square/server";

export const metadata = { title: "Today" };

export default async function Dashboard() {
  const repo = await getRepo();
  const [products, events, settings] = await Promise.all([repo.listProducts(), repo.listEvents(200), repo.getSettings()]);
  const names = Object.fromEntries(products.map((p) => [p.id, { name: p.name, sku: p.sku }]));
  const today = unitsSold(events, startOfDayChicago());
  const week = unitsSold(events, startOfWeekChicago());
  const low = lowStock(products, settings);
  const recent = products.slice(0, 6);
  const notInSquare = products.filter((p) => p.status === "available" && !p.square_variation_id).length;
  const errors = products.filter((p) => p.square_sync_error).length;

  const tile = "rounded-3xl border-[3px] border-ink p-5 shadow-[4px_4px_0_var(--color-ink)]";
  return (
    <div className="grid gap-8">
      <h1 className="font-display text-5xl">Today</h1>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
        <div className={`${tile} bg-sun`}><p className="text-sm font-bold uppercase tracking-wider">Sold today</p><p className="font-display text-5xl tabular-nums">{today}</p></div>
        <div className={`${tile} bg-cream`}><p className="text-sm font-bold uppercase tracking-wider">Sold this week</p><p className="font-display text-5xl tabular-nums">{week}</p></div>
        <div className={`${tile} ${low.length ? "bg-orange" : "bg-cream"}`}><p className="text-sm font-bold uppercase tracking-wider">Low stock</p><p className="font-display text-5xl tabular-nums">{low.length}</p></div>
        <div className={`${tile} ${!SQUARE ? "bg-cream" : errors || notInSquare ? "bg-lip text-cream" : "bg-violet text-sun"}`}>
          <p className="text-sm font-bold uppercase tracking-wider">Square</p>
          <p className="mt-1 text-lg font-bold">
            {!SQUARE ? "Not connected" : errors ? `${errors} items failed to sync` : notInSquare ? `${notInSquare} items not in Square yet` : "All synced"}
          </p>
          <Link href="/admin/square" className="text-sm font-bold underline underline-offset-4">Details</Link>
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border-[3px] border-ink bg-cream p-5" aria-labelledby="act-h">
          <div className="flex items-baseline justify-between"><h2 id="act-h" className="font-display text-3xl">Latest activity</h2>
            <Link href="/admin/activity" className="font-bold underline underline-offset-4">All</Link></div>
          <div className="mt-3"><EventList events={events.slice(0, 8)} names={names} /></div>
        </section>
        <div className="grid content-start gap-8">
          <section className="rounded-3xl border-[3px] border-ink bg-cream p-5" aria-labelledby="low-h">
            <h2 id="low-h" className="font-display text-3xl">Low stock</h2>
            {low.length ? (
              <ul className="mt-3 grid gap-2">{low.map((p) => (
                <li key={p.id} className="flex justify-between gap-3 font-semibold">
                  <Link href={`/admin/items/${p.id}`} className="underline underline-offset-2">{p.name}</Link><span className="tabular-nums">{p.quantity} left</span>
                </li>))}</ul>
            ) : <p className="mt-2 font-semibold">Nothing running low.</p>}
          </section>
          <section className="rounded-3xl border-[3px] border-ink bg-cream p-5" aria-labelledby="new-h">
            <div className="flex items-baseline justify-between"><h2 id="new-h" className="font-display text-3xl">Recently added</h2>
              <Link href="/admin/items/new" className="font-bold underline underline-offset-4">Add item</Link></div>
            <ul className="mt-3 grid gap-3">{recent.map((p) => (
              <li key={p.id}><Link href={`/admin/items/${p.id}`} className="flex items-center gap-3 font-semibold">
                <img src={p.photos[0] ?? "/brand/logo-160.webp"} alt="" width={44} height={55} className="h-14 w-11 rounded-lg border-2 border-ink object-cover" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span><span className="tabular-nums">{formatPrice(p.price_cents)}</span>
              </Link></li>))}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
