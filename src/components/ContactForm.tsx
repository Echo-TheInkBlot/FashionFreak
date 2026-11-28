"use client";
import { useState } from "react";

/** Demo only: validates and shows a confirmation, but nothing is sent yet. Wire to email or Supabase later. */
export function ContactForm({ itemSku, itemName }: { itemSku?: string; itemName?: string }) {
  const [sent, setSent] = useState(false);
  const field = "w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold";
  const label = "block text-sm font-bold uppercase tracking-wider mb-1.5";

  if (sent) {
    return (
      <div role="status" className="rounded-[28px] border-[3px] border-ink bg-violet p-8 text-cream">
        <p className="font-display text-4xl">Got it, cutie.</p>
        <p className="mt-2 font-semibold text-blush">This is a demo, so your message wasn&apos;t actually sent. On the real site it goes straight to the shop.</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (e.currentTarget.reportValidity()) setSent(true); }}
      className="grid gap-4 rounded-[28px] border-[3px] border-ink bg-blush p-6 shadow-[6px_6px_0_var(--color-ink)]">
      {itemSku && (
        <p className="rounded-2xl bg-ink px-4 py-3 font-bold text-sun">Asking about: {itemName} ({itemSku})</p>
      )}
      <input type="hidden" name="item" value={itemSku ?? ""} />
      <div><label htmlFor="c-name" className={label}>Your name</label><input id="c-name" name="name" required autoComplete="name" className={field} /></div>
      <div><label htmlFor="c-email" className={label}>Email or phone</label><input id="c-email" name="contact" required className={field} /></div>
      <div>
        <label htmlFor="c-topic" className={label}>What&apos;s up?</label>
        <select id="c-topic" name="topic" defaultValue={itemSku ? "item" : "general"} className={field}>
          <option value="item">Ask about an item / hold it for me</option>
          <option value="consign">Consigning or donating</option>
          <option value="general">Something else</option>
        </select>
      </div>
      <div><label htmlFor="c-msg" className={label}>Message</label><textarea id="c-msg" name="message" required rows={5} className={field}
        defaultValue={itemName ? `Is the ${itemName} still available? Could you hold it for me?` : ""} /></div>
      <button type="submit" className="wobble justify-self-start rounded-[40px_40px_40px_8px] border-[3px] border-ink bg-sun px-6 py-3 text-lg font-bold shadow-[4px_4px_0_var(--color-ink)]">Send it</button>
    </form>
  );
}
