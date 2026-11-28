import type { Metadata } from "next";
import { STORE, formatTime, fullAddress, mapsUrl, openStatus } from "@/lib/store-info";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Visit us" };

export default function Visit() {
  const status = openStatus();
  const todayIdx = new Date(new Date().toLocaleString("en-US", { timeZone: STORE.timezone })).getDay();

  return (
    <div className="mx-auto max-w-5xl px-4 pt-12">
      <h1 className="drip-title text-[clamp(48px,8vw,104px)]">Visit us</h1>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <div className="grid gap-6 content-start">
          <div className="rounded-[28px] border-[3px] border-ink bg-sun p-6 shadow-[5px_5px_0_var(--color-ink)]">
            <h2 className="text-sm font-bold uppercase tracking-wider">Address</h2>
            <p className="mt-1 font-display text-3xl leading-tight">{STORE.address.street}</p>
            <p className="font-bold">{STORE.address.city}, {STORE.address.state} {STORE.address.zip}</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full border-[3px] border-ink bg-ink px-4 py-2 font-bold text-sun">
              Get directions
            </a>
          </div>
          <div className="rounded-[28px] border-[3px] border-ink bg-blush p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wider">Hours</h2>
              <span className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold ${status.open ? "bg-violet text-sun" : "bg-cream"}`}>{status.label}</span>
            </div>
            <table className="mt-3 w-full tabular-nums">
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((i) => {
                  const h = STORE.hours[i];
                  const today = i === todayIdx;
                  return (
                    <tr key={h.day} className={today ? "font-bold" : ""} aria-current={today ? "date" : undefined}>
                      <th scope="row" className="py-1 text-left font-semibold">{h.day}{today && " (today)"}</th>
                      <td className="py-1 text-right">{h.open && h.close ? `${formatTime(h.open)} – ${formatTime(h.close)}` : "Closed"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="relative isolate min-h-80 overflow-hidden rounded-[28px] border-[3px] border-ink bg-violet">
          <div className="lava" aria-hidden><i /><i /><i /></div>
          <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="font-display text-4xl text-sun [-webkit-text-stroke:1.5px_var(--color-ink)] [paint-order:stroke_fill]">Map goes here</p>
            <p className="font-semibold text-ink bg-blush rounded-2xl px-4 py-2">Placeholder. We&apos;ll embed a real map for launch.</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">Open {fullAddress} in Google Maps</a>
          </div>
        </div>
      </div>
    </div>
  );
}
