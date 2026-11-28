"use client";
import { useActionState, useRef, useState, useTransition } from "react";
import { saveProductAction, type ActionResult } from "@/app/admin/actions";
import { draftListingAction, type DraftResult } from "@/app/admin/ai-actions";
import { shrinkImage } from "./shrinkImage";
import { CATEGORIES, type Product } from "@/lib/inventory/types";
import { CATEGORY_LABELS } from "@/lib/catalog-filters";

const field = "w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold";
const label = "mb-1.5 block text-sm font-bold uppercase tracking-wider";

/** Add or edit an item. Stock levels are changed with the stock buttons, so quantity is only set when adding. */
export function ProductForm({ product, aiLive }: { product?: Product; aiLive: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProductAction, null);
  const [preview, setPreview] = useState<string | null>(product?.photos[0] ?? null);
  const [ooak, setOoak] = useState(product?.is_one_of_a_kind ?? true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [drafting, startDraft] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function onPhoto(input: HTMLInputElement) {
    const f = input.files?.[0];
    if (!f) return;
    setPreview(URL.createObjectURL(f));
    setDraft(null);
    const small = await shrinkImage(f);
    setPhoto(small);
    try { const dt = new DataTransfer(); dt.items.add(small); input.files = dt.files; } catch { /* keep the original */ }
  }

  const runDraft = () => startDraft(async () => {
    if (!photo) return;
    const fd = new FormData();
    fd.set("photo", photo);
    const r = await draftListingAction(fd);
    setDraft(r);
    const form = formRef.current;
    if (!r.ok || !r.draft || !form) return;
    const set = (name: string, value: string, onlyIfEmpty = false) => {
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
      if (el && !(onlyIfEmpty && el.value)) el.value = value;
    };
    set("name", r.draft.name);
    set("description", r.draft.description);
    set("category", r.draft.category);
    set("color", r.draft.color);
    set("tags", r.draft.tags.join(", "));
    set("ai_description", r.draft.visual_notes);
    if (r.draft.size_on_tag) set("size", r.draft.size_on_tag, true);
  });

  return (
    <form ref={formRef} action={action} className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid min-w-0 content-start gap-3">
        <label htmlFor="p-photo" className={label}>Photo</label>
        <div className="aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border-[3px] border-ink bg-violet lg:max-w-none">
          {preview ? <img src={preview} alt="Item photo preview" className="h-full w-full object-cover" />
            : <div className="grid h-full place-items-center p-6 text-center font-bold text-sun">Snap or choose a photo</div>}
        </div>
        <input id="p-photo" name="photo" type="file" accept="image/*" capture="environment"
          onChange={(e) => onPhoto(e.currentTarget)}
          className="w-full min-w-0 font-semibold file:mr-3 file:rounded-full file:border-2 file:border-ink file:bg-sun file:px-4 file:py-2 file:font-bold" />
        <button type="button" onClick={runDraft} disabled={!photo || drafting}
          className="rounded-2xl border-[3px] border-ink bg-violet px-4 py-3 font-bold text-sun shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-50">
          {drafting ? "Reading the photo…" : "✨ Draft details from photo"}
        </button>
        {draft && (
          <p role="status" className={`rounded-2xl px-4 py-2 text-sm font-bold ${draft.ok ? (draft.simulated ? "bg-blush" : "bg-sun") : "bg-lip text-cream"}`}>
            {draft.message}{draft.ok && " Edit anything before saving."}
          </p>
        )}
        <p className="text-sm">
          {aiLive ? "Claude looks at the photo and fills in the name, description, category, color and tags. Nothing saves until you do."
            : "No AI key is set, so drafts are simulated samples for the demo."}
        </p>
      </div>

      <div className="grid min-w-0 content-start gap-4">
        {state && !state.ok && <p role="alert" className="rounded-2xl bg-lip px-4 py-3 font-bold text-cream">{state.message}</p>}
        <div><label htmlFor="p-name" className={label}>Name</label>
          <input id="p-name" name="name" required defaultValue={product?.name} placeholder="Midnight Velvet Witch Dress" className={field} /></div>
        <div><label htmlFor="p-desc" className={label}>Description</label>
          <textarea id="p-desc" name="description" rows={4} defaultValue={product?.description} className={field} /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label htmlFor="p-cat" className={label}>Category</label>
            <select id="p-cat" name="category" required defaultValue={product?.category ?? ""} className={field}>
              <option value="" disabled>Pick one</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select></div>
          <div><label htmlFor="p-size" className={label}>Size</label>
            <input id="p-size" name="size" defaultValue={product?.size ?? ""} placeholder="M, 2X, XS-6X, 9" className={field} /></div>
          <div><label htmlFor="p-color" className={label}>Color</label>
            <input id="p-color" name="color" defaultValue={product?.color ?? ""} placeholder="black" className={field} /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label htmlFor="p-price" className={label}>Price ($)</label>
            <input id="p-price" name="price" type="number" inputMode="decimal" min="0" step="0.01" required
              defaultValue={product ? (product.price_cents / 100).toString() : ""} className={field} /></div>
          {!product && (
            <div><label htmlFor="p-qty" className={label}>Quantity</label>
              <input id="p-qty" name="quantity" type="number" min="0" max={ooak ? 1 : undefined} step="1" defaultValue={1} className={field} /></div>
          )}
          <label className="flex items-center gap-3 self-end pb-3 font-bold">
            <input type="checkbox" name="one_of_a_kind" checked={ooak} onChange={(e) => setOoak(e.target.checked)} className="size-6 accent-ink" />
            One of a kind
          </label>
        </div>
        <div><label htmlFor="p-tags" className={label}>Tags</label>
          <input id="p-tags" name="tags" defaultValue={product?.tags.join(", ")} placeholder="goth, velvet, witchy" className={field} /></div>
        <div><label htmlFor="p-ai" className={label}>Visual notes for photo matching</label>
          <input id="p-ai" name="ai_description" defaultValue={product?.ai_description ?? ""} placeholder="black crushed velvet maxi, bell sleeves, lace-up bodice" className={field} /></div>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={pending} className="rounded-2xl border-[3px] border-ink bg-sun px-6 py-3 text-lg font-bold shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-60">
            {pending ? "Saving…" : product ? "Save changes" : "Add item"}
          </button>
          <p className="text-sm font-semibold">Saving also updates the item in Square when Square is connected.</p>
        </div>
      </div>
    </form>
  );
}
