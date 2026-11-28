"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { confirmPhotoSaleAction, photoLookupAction, type LookupActionResult, type MatchCard } from "@/app/admin/ai-actions";
import { undoAction, type ActionResult } from "@/app/admin/actions";
import type { MatchOption } from "@/lib/ai/rules";
import { CATEGORIES } from "@/lib/inventory/types";
import { CATEGORY_LABELS } from "@/lib/catalog-filters";
import { broadcastLive } from "./broadcast";
import { shrinkImage } from "./shrinkImage";

const btn = "rounded-2xl border-[3px] border-ink font-bold shadow-[3px_3px_0_var(--color-ink)] active:translate-y-0.5 active:shadow-none disabled:opacity-50";
const pct = (c: number) => `${Math.round(c * 100)}%`;

function ItemFace({ item, big }: { item: MatchCard; big?: boolean }) {
  return (
    <div className={big ? "grid gap-4 sm:grid-cols-[200px_1fr]" : "grid gap-3"}>
      <div className="aspect-[4/5] overflow-hidden rounded-2xl border-[3px] border-ink bg-violet">
        {item.photo && <img src={item.photo} alt="" className="h-full w-full object-cover" />}
      </div>
      <div>
        <p className={`font-display ${big ? "text-3xl" : "text-xl"} leading-tight`}>{item.name}</p>
        <p className="mt-1 font-bold">{item.price} · {item.size ?? "One size"} · <span className="font-mono">{item.sku}</span></p>
      </div>
    </div>
  );
}

export function PhotoSell({ aiLive, squareConnected }: { aiLive: boolean; squareConnected: boolean }) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [sim, setSim] = useState<"high" | "low">("high");
  const [res, setRes] = useState<LookupActionResult | null>(null);
  const [sold, setSold] = useState<ActionResult | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const [pending, start] = useTransition();

  const reset = () => { setRes(null); setSold(null); setShowOthers(false); };

  const find = () => start(async () => {
    if (!photo) return;
    reset();
    const fd = new FormData();
    fd.set("photo", photo);
    if (category) fd.set("category", category);
    fd.set("sim", sim);
    setRes(await photoLookupAction(fd));
  });

  // The only path to a sale on this screen: a staff member taps a button.
  const confirm = (o: MatchOption) => start(async () => {
    const r = await confirmPhotoSaleAction(o.productId, o.confidence);
    setSold(r);
    if (r.ok) broadcastLive(r);
  });
  const undo = (eventId: string) => start(async () => {
    const r = await undoAction(eventId);
    setSold(r.ok ? { ...r, message: "Undone. The item is back in stock.", eventId: undefined } : r);
    if (r.ok) broadcastLive(r);
  });

  const items = res?.items ?? {};
  const ui = res?.ui;

  const SellButton = ({ o, label }: { o: MatchOption; label: string }) => (
    <button type="button" disabled={pending || !!sold?.ok} onClick={() => confirm(o)} className={`${btn} w-full bg-sun px-4 py-3 text-lg`}>
      {label}
    </button>
  );
  const SquareHint = ({ sku }: { sku: string }) => squareConnected
    ? <p className="text-sm font-semibold">Ringing it up on the Square iPad instead? Scan or type <span className="font-mono font-bold">{sku}</span> there and the site updates itself.</p>
    : null;

  const Chooser = ({ options }: { options: MatchOption[] }) => (
    <div className="grid gap-4 sm:grid-cols-3">
      {options.map((o) => items[o.productId] && (
        <div key={o.productId} className="grid content-between gap-3 rounded-3xl border-[3px] border-ink bg-cream p-4">
          <ItemFace item={items[o.productId]} />
          <p className="text-sm"><span className="font-bold">{pct(o.confidence)} match.</span> {o.reason}</p>
          <SellButton o={o} label="This one: sold" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-3xl border-[3px] border-ink bg-blush p-5 md:grid-cols-[240px_1fr]">
        <div className="aspect-[4/5] overflow-hidden rounded-2xl border-[3px] border-ink bg-violet">
          {preview ? <img src={preview} alt="Photo to look up" className="h-full w-full object-cover" />
            : <div className="grid h-full place-items-center p-6 text-center font-bold text-sun">Snap the item</div>}
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <label className="grid gap-1.5 font-bold">
            <span className="text-sm uppercase tracking-wider">Photo</span>
            <input type="file" accept="image/*" capture="environment"
              onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; reset(); setPreview(URL.createObjectURL(f)); setPhoto(await shrinkImage(f)); }}
              className="w-full min-w-0 font-semibold file:mr-3 file:rounded-full file:border-2 file:border-ink file:bg-sun file:px-4 file:py-2 file:font-bold" />
          </label>
          <label className="grid gap-1.5 font-bold">
            <span className="text-sm uppercase tracking-wider">What kind of item? (optional, makes it faster)</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full min-w-0 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold">
              <option value="">Let the AI tell</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </label>
          {!aiLive && (
            <fieldset className="rounded-2xl border-2 border-dashed border-ink p-3 text-sm font-semibold">
              <legend className="px-1 font-bold">Demo: no AI key set, results are simulated</legend>
              <label className="mr-4"><input type="radio" name="sim" checked={sim === "high"} onChange={() => setSim("high")} /> Sure match</label>
              <label><input type="radio" name="sim" checked={sim === "low"} onChange={() => setSim("low")} /> Unsure match</label>
            </fieldset>
          )}
          <button type="button" onClick={find} disabled={!photo || pending} className={`${btn} bg-violet px-6 py-3 text-lg text-sun`}>
            {pending && !res ? "Looking…" : "Find this item"}
          </button>
        </div>
      </section>

      {res && !res.ok && <p role="alert" className="rounded-2xl bg-lip px-4 py-3 font-bold text-cream">{res.message}</p>}

      {sold && (
        <div role="status" className={`flex flex-wrap items-center justify-between gap-3 rounded-3xl border-[3px] border-ink p-5 text-2xl font-bold ${sold.ok ? "bg-sun" : "bg-lip text-cream"}`}>
          <span>{sold.ok ? "✓ " : ""}{sold.message}</span>
          {sold.ok && sold.eventId && (
            <button type="button" onClick={() => undo(sold.eventId!)} disabled={pending} className="rounded-full border-[3px] border-ink bg-ink px-6 py-2 text-lg text-sun">Undo</button>
          )}
        </div>
      )}

      {res?.ok && ui && (
        <section aria-live="polite" className="grid gap-4">
          {res.simulated && <p className="w-fit rounded-full bg-ink px-3 py-1 text-sm font-bold text-sun">Simulated result: add an Anthropic API key for real matching</p>}

          {ui.mode === "confirm" && items[ui.option.productId] && (
            <>
              <div className="grid gap-4 rounded-3xl border-[3px] border-ink bg-cream p-5">
                <p className="text-sm font-bold uppercase tracking-wider">Best match · {pct(ui.option.confidence)} sure</p>
                <ItemFace item={items[ui.option.productId]} big />
                <p>{ui.option.reason}</p>
                <SellButton o={ui.option} label="Confirm sold" />
                <SquareHint sku={items[ui.option.productId].sku} />
                {!showOthers && (
                  <button type="button" onClick={() => setShowOthers(true)} className="w-fit font-bold underline">Not it? Show other options</button>
                )}
              </div>
              {showOthers && (ui.others.length ? <Chooser options={ui.others} /> : <p className="font-semibold">No other close matches.</p>)}
            </>
          )}

          {ui.mode === "choose" && (
            <>
              <p className="font-bold">Not sure enough to call it (needs {pct(res.threshold ?? 0.85)}). Which one is it?</p>
              <Chooser options={ui.options} />
            </>
          )}

          {ui.mode === "none" && <p className="font-bold">No close match in stock.</p>}

          <form action="/admin/items" className="flex flex-wrap gap-3">
            <label htmlFor="ps-q" className="sr-only">Search items</label>
            <input id="ps-q" name="q" placeholder="None of these? Search name, SKU, tag…" className="min-w-0 flex-1 rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold" />
            <button className={`${btn} bg-blush px-5 py-3`}>Search</button>
          </form>
        </section>
      )}

      <p className="text-sm">
        The AI only suggests. Nothing is marked sold until you tap. <Link href="/admin/activity" className="font-bold underline">Every sale is in Activity</Link> with its AI confidence, and can be undone.
      </p>
    </div>
  );
}
