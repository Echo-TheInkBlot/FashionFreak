"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { undoAction } from "@/app/admin/actions";
import type { InventoryEvent } from "@/lib/inventory/types";
import { broadcastLive } from "./broadcast";

const METHOD: Record<InventoryEvent["method"], string> = {
  barcode: "Scan", photo_ai: "Photo match", manual: "Staff", pos_webhook: "Square", undo: "Undo",
};

function describe(e: InventoryEvent) {
  if (e.status_after !== e.status_before && e.change === 0) return e.status_after === "hidden" ? "Hidden" : e.status_after === "available" ? "Shown on site" : `Marked ${e.status_after}`;
  if (e.change < 0) return `Sold ${-e.change}`;
  if (e.change > 0) return `+${e.change} in stock`;
  return e.note ?? "Updated";
}

export function EventList({ events, names }: { events: InventoryEvent[]; names: Record<string, { name: string; sku: string }> }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!events.length) return <p className="font-semibold">Nothing yet. Sales from Square and staff changes show up here.</p>;
  return (
    <div>
      {msg && <p role="status" className="mb-3 rounded-2xl bg-sun px-4 py-2 font-bold">{msg}</p>}
      <ul className="divide-y-2 divide-ink/15">
        {events.map((e) => {
          const n = names[e.product_id];
          return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-bold">
                  {describe(e)} · {n ? <Link className="underline underline-offset-2" href={`/admin/items/${e.product_id}`}>{n.name}</Link> : "Deleted item"}
                </p>
                <p className="text-sm">
                  <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-sun">{METHOD[e.method]}</span>{" "}
                  {new Date(e.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  {e.confidence != null && ` · ${Math.round(e.confidence * 100)}% match`}
                  {e.note && e.change !== 0 && ` · ${e.note}`}
                  {e.undone_by_event_id && " · undone"}
                </p>
              </div>
              {e.method !== "undo" && !e.undone_by_event_id && (
                <button type="button" disabled={pending}
                  onClick={() => start(async () => { const r = await undoAction(e.id); setMsg(r.message); if (r.ok) broadcastLive(r); })}
                  className="rounded-full border-2 border-ink px-4 py-1.5 font-bold hover:bg-ink hover:text-sun disabled:opacity-50">
                  Undo
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
