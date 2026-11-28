"use client";
import { useState, useTransition } from "react";
import { pushToSquareAction } from "@/app/admin/actions";
import type { Product } from "@/lib/inventory/types";

export function SquareItemPanel({ product, connected, environment }: { product: Product; connected: boolean; environment: string | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <section aria-labelledby="sq-h" className="rounded-3xl border-[3px] border-ink bg-cream p-5">
      <h2 id="sq-h" className="font-display text-2xl">Square</h2>
      {!connected ? (
        <p className="mt-2 font-semibold">Square isn&apos;t connected yet, so this item only lives on the website. Once it is, saving pushes it to the Square item library automatically.</p>
      ) : (
        <>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm font-semibold">
            <dt>Status</dt><dd>{product.square_sync_error ? <span className="text-lip">{product.square_sync_error}</span> : product.square_variation_id ? `In Square (${environment})` : "Not in Square yet"}</dd>
            {product.square_synced_at && (<><dt>Last synced</dt><dd>{new Date(product.square_synced_at).toLocaleString("en-US", { timeZone: "America/Chicago" })}</dd></>)}
          </dl>
          <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await pushToSquareAction(product.id)).message))}
            className="mt-4 rounded-2xl border-[3px] border-ink bg-violet px-4 py-2.5 font-bold text-cream disabled:opacity-60">
            {product.square_variation_id ? "Re-send to Square" : "Send to Square"}
          </button>
          {msg && <p role="status" className="mt-2 font-bold">{msg}</p>}
        </>
      )}
      <p className="mt-4 text-sm">At the register: scan this item&apos;s label in Square instead of typing the price. That&apos;s what lets the website know it sold.</p>
    </section>
  );
}
