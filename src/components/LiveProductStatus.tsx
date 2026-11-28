"use client";
import type { Product } from "@/lib/inventory/types";
import { displayStatus } from "@/lib/inventory/rules";
import { useLiveProduct, useLiveSettings } from "./LiveInventory";
import { StatusBadge } from "./StatusBadge";

export function LiveProductStatus({ product: initial, variant }: { product: Product; variant: "photo" | "badge" }) {
  const product = useLiveProduct(initial);
  const status = displayStatus(product, useLiveSettings()) ?? "sold";
  const sold = status === "sold";

  if (variant === "badge") {
    return (
      <p aria-live="polite" className="flex items-center gap-3 font-bold">
        <StatusBadge status={status} />
        {sold ? "Someone got to it first." : status === "only_one_left" ? "Just one in the shop." : `${product.quantity} in the shop.`}
      </p>
    );
  }
  return (
    <div className="relative rotate-[-1deg]">
      <div className="melt-frame aspect-[4/5] border-[3px] border-ink bg-violet shadow-[8px_8px_0_var(--color-ink)]">
        <img src={product.photos[0]} alt={product.name} width={800} height={1000}
          className={`h-full w-full object-cover ${sold ? "grayscale-[60%] brightness-90" : ""}`} />
        {sold && <span className="sold-stamp" aria-hidden>SOLD</span>}
      </div>
    </div>
  );
}
