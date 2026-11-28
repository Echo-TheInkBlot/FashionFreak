"use client";
import { useState, useTransition } from "react";
import { pushAllToSquareAction, reconcileAction } from "@/app/admin/actions";

export function SquareTools() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const btn = "rounded-2xl border-[3px] border-ink px-5 py-3 font-bold shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-60";
  return (
    <section className="flex flex-wrap items-center gap-4">
      <button disabled={pending} className={`${btn} bg-sun`} onClick={() => start(async () => setMsg((await pushAllToSquareAction()).message))}>Send all items to Square</button>
      <button disabled={pending} className={`${btn} bg-cream`} onClick={() => start(async () => setMsg((await reconcileAction()).message))}>Check counts against Square now</button>
      {msg && <p role="status" className="w-full font-bold">{msg}</p>}
    </section>
  );
}
