"use client";
import { useEffect, useRef } from "react";
import { findSkuAction } from "@/app/admin/actions";

/**
 * Find an item by SKU. A USB or Bluetooth barcode scanner types like a keyboard and presses Enter,
 * so scanning a label anywhere on a staff page jumps to that item.
 */
export function ScanBox() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Typing fast into nothing (a scanner) goes into this box.
    let buf = ""; let last = 0;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      const now = Date.now();
      if (now - last > 60) buf = "";
      last = now;
      if (e.key.length === 1) buf += e.key;
      if (buf.length >= 4 && ref.current) { e.preventDefault(); ref.current.value = buf; ref.current.focus(); buf = ""; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form action={findSkuAction} role="search">
      <label htmlFor="scan" className="sr-only">Scan or type a SKU</label>
      <input ref={ref} id="scan" name="sku" placeholder="Scan or type SKU" autoComplete="off" spellCheck={false}
        className="w-40 rounded-full border-2 border-sun bg-ink px-3 py-1.5 font-bold text-sun placeholder:text-blush/60 sm:w-48" />
    </form>
  );
}
