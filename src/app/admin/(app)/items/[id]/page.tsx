import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepo } from "@/lib/inventory/server-repo";
import { formatPrice } from "@/lib/inventory/rules";
import { SQUARE } from "@/lib/square/server";
import { ProductForm } from "@/components/admin/ProductForm";
import { StockPanel } from "@/components/admin/StockPanel";
import { EventList } from "@/components/admin/EventList";
import { SquareItemPanel } from "@/components/admin/SquareItemPanel";

export const metadata = { title: "Item" };

export default async function ItemPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const [{ id }, { saved, edit }] = await Promise.all([params, searchParams]);
  const repo = await getRepo();
  const product = await repo.getProduct(id);
  if (!product) notFound();
  const events = (await repo.listEvents(500)).filter((e) => e.product_id === id).slice(0, 20);

  return (
    <div className="grid gap-6">
      {saved && <p role="status" className="rounded-2xl border-[3px] border-ink bg-sun px-4 py-3 font-bold">✓ Saved</p>}
      <div className="flex flex-wrap items-start gap-5">
        <img src={product.photos[0] ?? "/brand/logo-160.webp"} alt={product.name} width={120} height={150} className="h-36 w-28 rounded-2xl border-[3px] border-ink object-cover" />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold">{product.sku}</p>
          <h1 className="font-display text-4xl leading-tight">{product.name}</h1>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatPrice(product.price_cents)}{product.size && ` · Size ${product.size}`}</p>
          <div className="mt-2 flex flex-wrap gap-4 font-bold">
            <Link href={`/shop/${product.sku}`} className="underline underline-offset-4">View on site</Link>
            <Link href={`/admin/labels?ids=${product.id}`} className="underline underline-offset-4">Print label</Link>
            <Link href={edit ? `/admin/items/${id}` : `/admin/items/${id}?edit=1`} className="underline underline-offset-4">{edit ? "Close editor" : "Edit details"}</Link>
          </div>
        </div>
      </div>

      {edit ? <ProductForm product={product} /> : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <StockPanel product={product} squareConnected={Boolean(SQUARE)} />
          <SquareItemPanel product={product} connected={Boolean(SQUARE)} environment={SQUARE?.environment ?? null} />
          <section className="rounded-3xl border-[3px] border-ink bg-cream p-5 lg:col-span-2" aria-labelledby="hist-h">
            <h2 id="hist-h" className="font-display text-2xl">History</h2>
            <div className="mt-3"><EventList events={events} names={{ [product.id]: { name: product.name, sku: product.sku } }} /></div>
          </section>
        </div>
      )}
    </div>
  );
}
