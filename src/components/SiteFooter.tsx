import Link from "next/link";
import { STORE, fullAddress, formatTime, mapsUrl } from "@/lib/store-info";
import { LogoBadge } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="on-ink bg-ink text-blush mt-24">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-10 sm:grid-cols-3">
        <div>
          <LogoBadge size={112} className="mb-4 border-[3px] border-sun" />
          <p className="font-display text-3xl text-sun">Fashion Freak</p>
          <p className="mt-2">{STORE.tagline}. Thrift and consignment, sizes {STORE.sizes}.</p>
        </div>
        <div>
          <h2 className="font-bold text-sun uppercase tracking-widest text-sm">Find us</h2>
          <p className="mt-2"><a className="underline underline-offset-4" href={mapsUrl} target="_blank" rel="noreferrer">{fullAddress}</a></p>
          <p className="mt-1">
            <a className="underline underline-offset-4" href={`https://www.instagram.com/${STORE.instagram}/`} target="_blank" rel="noreferrer">@{STORE.instagram}</a>
          </p>
        </div>
        <div>
          <h2 className="font-bold text-sun uppercase tracking-widest text-sm">Hours</h2>
          <ul className="mt-2 space-y-0.5 tabular-nums">
            {[1, 2, 3, 4, 5, 6, 0].map((i) => {
              const h = STORE.hours[i];
              return (
                <li key={h.day} className="flex justify-between gap-4 max-w-64">
                  <span>{h.day.slice(0, 3)}</span>
                  <span>{h.open && h.close ? `${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed"}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <div className="border-t border-blush/20">
        <div className="mx-auto max-w-6xl px-4 py-4 text-sm flex flex-wrap justify-between gap-2">
          <span>Demo site. Products and images are placeholders.</span>
          <Link href="/admin" className="underline underline-offset-4">Staff login</Link>
        </div>
      </div>
    </footer>
  );
}
