"use client";
import Link from "next/link";
import type { Product } from "@/lib/inventory/types";
import { displayStatus, formatPrice } from "@/lib/inventory/rules";
import { useLiveProduct, useLiveSettings } from "./LiveInventory";
import { StatusBadge } from "./StatusBadge";

export function ProductCard({ product: initial, index = 0 }: { product: Product; index?: number }) {
  const product = useLiveProduct(initial);
  const settings = useLiveSettings();
  const status = displayStatus(product, settings);
  if (!status) return null; // hidden live (e.g. staff hid it)

  const tilt = ["rotate-[-1.2deg]", "rotate-[0.8deg]", "rotate-[-0.4deg]", "rotate-[1.4deg]"][index % 4];
  const sold = status === "sold";

  return (
    <li className={`list-none ${tilt}`}>
      <Link
        href={`/shop/${product.sku}`}
        className="wobble group block rounded-[30px_30px_30px_30px/30px_30px_70px_70px] border-[3px] border-ink bg-blush p-3 shadow-[6px_6px_0_var(--color-ink)] transition-transform hover:-translate-y-1"
        aria-label={`${product.name}, ${formatPrice(product.price_cents)}${sold ? ", sold" : ""}`}
      >
        <div className="melt-frame aspect-[4/5] bg-violet">
          <img
            src={product.photos[0] ?? "/placeholders/missing.svg"}
            alt={product.name}
            width={400}
            height={500}
            loading={index < 4 ? "eager" : "lazy"}
            className={`h-full w-full object-cover transition-[filter] ${sold ? "grayscale-[60%] brightness-90" : ""}`}
          />
          {sold && <span className="sold-stamp" aria-hidden>SOLD</span>}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 px-1">
          <h3 className="font-bold leading-tight">{product.name}</h3>
          <span className="font-bold tabular-nums">{formatPrice(product.price_cents)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-1 text-sm">
          <StatusBadge status={status} />
          {product.size && <span className="font-semibold">Size {product.size}</span>}
          {product.is_one_of_a_kind && !sold && <span className="font-semibold">· One of one</span>}
        </div>
      </Link>
    </li>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-10 min-[440px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
    </ul>
  );
}
