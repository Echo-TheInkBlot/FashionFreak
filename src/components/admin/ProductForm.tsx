"use client";
import { useActionState, useState } from "react";
import { saveProductAction, type ActionResult } from "@/app/admin/actions";
import { CATEGORIES, type Product } from "@/lib/inventory/types";
import { CATEGORY_LABELS } from "@/lib/catalog-filters";

const field = "w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold";
const label = "mb-1.5 block text-sm font-bold uppercase tracking-wider";

/** Add or edit an item. Stock levels are changed with the stock buttons, so quantity is only set when adding. */
export function ProductForm({ product }: { product?: Product }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProductAction, null);
  const [preview, setPreview] = useState<string | null>(product?.photos[0] ?? null);
  const [ooak, setOoak] = useState(product?.is_one_of_a_kind ?? true);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid content-start gap-3">
        <label htmlFor="p-photo" className={label}>Photo</label>
        <div className="aspect-[4/5] overflow-hidden rounded-3xl border-[3px] border-ink bg-violet">
          {preview ? <img src={preview} alt="Item photo preview" className="h-full w-full object-cover" />
            : <div className="grid h-full place-items-center p-6 text-center font-bold text-sun">Snap or choose a photo</div>}
        </div>
        <input id="p-photo" name="photo" type="file" accept="image/*" capture="environment"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }}
          className="font-semibold file:mr-3 file:rounded-full file:border-2 file:border-ink file:bg-sun file:px-4 file:py-2 file:font-bold" />
        <p className="text-sm">AI-drafted names and descriptions from the photo arrive in the next phase.</p>
      </div>

      <div className="grid content-start gap-4">
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
