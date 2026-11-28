import { getRepo } from "@/lib/inventory/server-repo";
import { SQUARE } from "@/lib/square/server";
import { SquareTools } from "@/components/admin/SquareTools";

export const metadata = { title: "Square" };

export default async function SquarePage() {
  const products = await (await getRepo()).listProducts();
  const linked = products.filter((p) => p.square_variation_id).length;
  const failed = products.filter((p) => p.square_sync_error);
  const steps = [
    ["Create a Square developer app", "developer.squareup.com → Applications → New. Use the Sandbox tab for the demo."],
    ["Add the keys to the environment", "SQUARE_ACCESS_TOKEN, SQUARE_LOCATION_ID, SQUARE_ENVIRONMENT (sandbox or production)."],
    ["Turn on the webhook", "Webhooks → Add subscription → event inventory.count.updated → URL <your site>/api/square/webhook. Copy its signature key into SQUARE_WEBHOOK_SIGNATURE_KEY and the URL into SQUARE_WEBHOOK_URL."],
    ["Send items to Square", "Use the button below once. New items go to Square automatically when they're saved."],
    ["At the register", "Scan the item's label in Square instead of typing the price. The website flips it to SOLD within seconds."],
  ];
  return (
    <div className="grid gap-6">
      <h1 className="font-display text-5xl">Square</h1>
      <section className={`rounded-3xl border-[3px] border-ink p-5 ${SQUARE ? "bg-violet text-cream" : "bg-cream"}`}>
        <p className="text-2xl font-bold">{SQUARE ? `Connected to Square (${SQUARE.environment})` : "Not connected yet"}</p>
        <p className="mt-1 font-semibold">{linked} of {products.length} items are linked to Square.{failed.length ? ` ${failed.length} failed to sync.` : ""}</p>
        {SQUARE && !SQUARE.webhookSignatureKey && <p className="mt-2 font-bold">The webhook signature key is missing, so sales from Square can&apos;t reach the site yet.</p>}
      </section>
      {SQUARE && <SquareTools />}
      {failed.length > 0 && (
        <section className="rounded-3xl border-[3px] border-ink bg-cream p-5">
          <h2 className="font-display text-2xl">Sync problems</h2>
          <ul className="mt-2 grid gap-1 font-semibold">{failed.map((p) => <li key={p.id}>{p.name}: {p.square_sync_error}</li>)}</ul>
        </section>
      )}
      <section className="rounded-3xl border-[3px] border-ink bg-cream p-5" aria-labelledby="setup-h">
        <h2 id="setup-h" className="font-display text-2xl">Setup</h2>
        <ol className="mt-3 grid gap-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-bold text-sun">{i + 1}</span>
              <div><p className="font-bold">{t}</p><p className="text-sm">{d}</p></div></li>
          ))}
        </ol>
        <p className="mt-4 text-sm font-semibold">A nightly check also compares every count with Square and fixes any drift, so a missed webhook can&apos;t leave a sold item up for long.</p>
      </section>
    </div>
  );
}
