import type { Metadata } from "next";
import Link from "next/link";
import { STORE } from "@/lib/store-info";

export const metadata: Metadata = { title: "Our story" };

export default function About() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12">
      <h1 className="drip-title text-[clamp(48px,8vw,104px)]">Our story</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-[1.3fr_1fr] items-start">
        <div className="space-y-5 text-lg">
          {/* Placeholder copy: replace with the owner's own words. */}
          <p className="rounded-[28px_28px_28px_8px] bg-ink px-6 py-5 font-semibold text-blush">
            Fashion Freak opened on Oliver in {STORE.opened} with one idea: Wichita deserved a thrift store where the weird
            stuff isn&apos;t buried in the back. It is the whole point.
          </p>
          <p>
            We&apos;re an all-alternative thrift and consignment shop. Gothic, hippie, rave, festival and costume clothing,
            all under one roof, in sizes {STORE.sizes}. Everything is secondhand, handmade, or consigned by people in the
            community, so most pieces are one of one.
          </p>
          <p>
            Come as you are, take your time, try on the loud thing. Nobody here will tell you it&apos;s too much.
          </p>
          <p className="text-sm font-bold uppercase tracking-wider">This page uses placeholder copy until the owner shares her story.</p>
        </div>
        <div className="grid gap-5">
          {[
            ["Thrift", "Hand-picked secondhand pieces, new every week."],
            ["Consign", "Bring us your best freak gear and earn when it sells."],
            ["Donate", "Clean out your closet, keep it out of the landfill."],
          ].map(([t, d], i) => (
            <div key={t} className={`rounded-3xl border-[3px] border-ink p-5 shadow-[5px_5px_0_var(--color-ink)] ${["bg-sun", "bg-blush", "bg-orange"][i]}`}>
              <h2 className="font-display text-3xl">{t}</h2>
              <p className="mt-1 font-semibold">{d}</p>
            </div>
          ))}
          <Link href="/contact" className="font-bold underline underline-offset-4">Ask about consigning</Link>
        </div>
      </div>
    </div>
  );
}
