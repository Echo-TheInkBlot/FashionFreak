"use client";
import { useState, useTransition } from "react";
import { stockAction, undoAction, type ActionResult, type StockAction } from "@/app/admin/actions";
import type { Product } from "@/lib/inventory/types";
import { broadcastLive } from "./broadcast";

const btn = "rounded-2xl border-[3px] border-ink px-4 py-3 text-base font-bold disabled:opacity-50 shadow-[3px_3px_0_var(--color-ink)] active:translate-y-0.5 active:shadow-none";

export function StockPanel({ product, squareConnected }: { product: Product; squareConnected: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const run = (a: StockAction) => start(async () => {
    const r = await stockAction(product.id, a);
    setResult(r);
    if (r.ok) broadcastLive(r);
  });
  const undo = (eventId: string) => start(async () => {
    const r = await undoAction(eventId);
    setResult(r.ok ? { ...r, eventId: undefined } : r);
    if (r.ok) broadcastLive(r);
  });

  const available = product.status === "available";
  return (
    <section aria-labelledby="stock-h" className="rounded-3xl border-[3px] border-ink bg-cream p-5">
      <h2 id="stock-h" className="font-display text-2xl">Stock</h2>
      <p className="mt-1 font-semibold">
        {product.quantity} in stock · <span className="capitalize">{product.status}</span>
        {product.is_one_of_a_kind && " · one of a kind"}
      </p>

      {result && (
        <div role="status" className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-[3px] border-ink p-4 text-lg font-bold ${result.ok ? "bg-sun" : "bg-lip text-cream"}`}>
          <span>{result.ok ? "✓ " : ""}{result.message}</span>
          {result.ok && result.eventId && (
            <button type="button" onClick={() => undo(result.eventId!)} disabled={pending} className="rounded-full border-[3px] border-ink bg-ink px-5 py-2 text-sun">
              Undo
            </button>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button className={`${btn} bg-sun`} disabled={pending || !available} onClick={() => run("sell_one")}>Sold one</button>
        <button className={`${btn} bg-blush`} disabled={pending || (product.is_one_of_a_kind && product.quantity >= 1) || product.status === "hidden"} onClick={() => run("restock_one")}>Restock +1</button>
        <button className={`${btn} bg-blush`} disabled={pending || !available} onClick={() => run("mark_sold")}>Mark all sold</button>
        {product.status === "hidden"
          ? <button className={`${btn} bg-blush`} disabled={pending} onClick={() => run("unhide")}>Show on site</button>
          : <button className={`${btn} bg-blush`} disabled={pending} onClick={() => run("hide")}>Hide from site</button>}
        <button className={`${btn} bg-violet text-cream col-span-2`} disabled={pending || !available} onClick={() => run("square_sale")}
          title="Acts exactly like a sale rung up on the Square iPad">
          {squareConnected ? "Test: Square sale" : "Demo: simulate Square sale"}
        </button>
      </div>
      <p className="mt-3 text-sm">
        Normal sales happen on the Square iPad and show up here automatically. Use these for anything Square didn&apos;t see.
      </p>
    </section>
  );
}
