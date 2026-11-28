import { getRepo } from "@/lib/inventory/server-repo";
import { EventList } from "@/components/admin/EventList";
export const metadata = { title: "Activity" };
export default async function Activity() {
  const repo = await getRepo();
  const [events, products] = await Promise.all([repo.listEvents(200), repo.listProducts()]);
  const names = Object.fromEntries(products.map((p) => [p.id, { name: p.name, sku: p.sku }]));
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-5xl">Activity</h1>
      <p className="max-w-prose font-semibold">Every stock change, who or what made it, and an Undo. Undo is blocked if the item changed again afterwards, so it can never wipe out a later sale.</p>
      <section className="rounded-3xl border-[3px] border-ink bg-cream p-5"><EventList events={events} names={names} /></section>
    </div>
  );
}
