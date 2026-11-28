import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProduct, getPublicProducts } from "@/lib/catalog";
import { CATEGORY_LABELS } from "@/lib/catalog-filters";
import { ACTIVE_PROVIDER } from "@/lib/commerce";
import { formatPrice } from "@/lib/inventory/rules";
import { ProductGrid } from "@/components/ProductCard";
import { LiveProductStatus } from "@/components/LiveProductStatus";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sku: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getPublicProduct((await params).sku);
  return p ? { title: p.name, description: p.description } : { title: "Not found" };
}

export default async function ProductPage({ params }: Props) {
  const product = await getPublicProduct((await params).sku);
  if (!product) notFound();
  const related = (await getPublicProducts())
    .filter((p) => p.category === product.category && p.id !== product.id && p.status === "available")
    .slice(0, 4);
  const actions = ACTIVE_PROVIDER.actionsFor(product);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10">
      <nav aria-label="Breadcrumb" className="text-sm font-bold">
        <Link href="/shop" className="underline underline-offset-4">Shop</Link>
        <span aria-hidden> / </span>
        <Link href={`/shop?category=${product.category}`} className="underline underline-offset-4">{CATEGORY_LABELS[product.category]}</Link>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <LiveProductStatus product={product} variant="photo" />

        <div>
          <h1 className="drip-title text-[clamp(40px,6vw,72px)]">{product.name}</h1>
          <p className="mt-5 text-3xl font-bold tabular-nums">{formatPrice(product.price_cents)}</p>
          <div className="mt-4"><LiveProductStatus product={product} variant="badge" /></div>

          <p className="mt-6 max-w-prose text-lg">{product.description}</p>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 font-semibold">
            {product.size && (<><dt className="uppercase tracking-wider text-sm">Size</dt><dd>{product.size}</dd></>)}
            {product.color && (<><dt className="uppercase tracking-wider text-sm">Color</dt><dd className="capitalize">{product.color}</dd></>)}
            <dt className="uppercase tracking-wider text-sm">Item</dt><dd className="tabular-nums">{product.sku}</dd>
            {product.is_one_of_a_kind && (<><dt className="uppercase tracking-wider text-sm">Rarity</dt><dd>One of one. When it&apos;s gone, it&apos;s gone.</dd></>)}
          </dl>

          {product.tags.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tags">
              {product.tags.map((t) => <li key={t} className="rounded-full border-2 border-ink bg-blush px-3 py-1 text-sm font-bold">#{t}</li>)}
            </ul>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            {actions.map((a) => (
              <Link key={a.label} href={a.href}
                className={a.kind === "primary"
                  ? "wobble rounded-[40px_40px_40px_8px] border-[3px] border-ink bg-sun px-6 py-3.5 text-lg font-bold shadow-[4px_4px_0_var(--color-ink)]"
                  : "rounded-[40px_40px_40px_8px] border-[3px] border-ink bg-blush px-6 py-3.5 text-lg font-bold"}>
                {a.label}
              </Link>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold">No online checkout on this demo. Ask us to hold it, or come try it on.</p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-20" aria-labelledby="related">
          <h2 id="related" className="drip-title text-5xl">More like this</h2>
          <div className="mt-10"><ProductGrid products={related} /></div>
        </section>
      )}
    </div>
  );
}
