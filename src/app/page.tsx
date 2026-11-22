import Link from "next/link";
import { getPublicProducts } from "@/lib/catalog";
import { isJustIn } from "@/lib/catalog-filters";
import { ProductGrid } from "@/components/ProductCard";
import { Marquee } from "@/components/Marquee";
import { STORE, openStatus } from "@/lib/store-info";

export const dynamic = "force-dynamic";

const VIBES = [
  { title: "Goth", text: "Velvet, lace, buckles and black on black." },
  { title: "Hippie", text: "Crochet, fringe, tie-dye and 70s polyester." },
  { title: "Rave & festival", text: "Mesh, glitter, holographic everything." },
  { title: "Costume", text: "Horns, wigs and whatever the night calls for." },
];

export default async function Home() {
  const products = await getPublicProducts();
  const justIn = products.filter((p) => isJustIn(p) && p.status === "available").slice(0, 8);
  const status = openStatus();

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b-[3px] border-ink">
        <div className="lava" aria-hidden><i /><i /><i /></div>
        <div aria-hidden className="lips absolute right-4 top-8 hidden w-[min(34vw,320px)] z-10 sm:block" />
        <div className="relative z-20 mx-auto max-w-6xl px-4 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <p className="inline-block rounded-full border-2 border-ink bg-sun px-3 py-1 text-sm font-bold">
            {status.label} · {STORE.address.street}
          </p>
          <h1 className="drip-title mt-6 max-w-3xl text-[clamp(52px,10vw,120px)]">
            Hot, wet paint &amp; hotter vintage
          </h1>
          <p className="mt-6 max-w-xl rounded-[28px_28px_28px_8px] bg-ink px-5 py-4 text-lg font-semibold text-blush">
            Slip into something a little less comfortable. Gothic, hippie, rave and costume thrift from a shop
            that&apos;s way too hot for Kansas. Sizes {STORE.sizes}.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/shop?new=1" className="wobble rounded-[40px_40px_40px_8px] border-[3px] border-ink bg-sun px-6 py-3.5 text-lg font-bold shadow-[4px_4px_0_var(--color-ink)]">
              Get it while it&apos;s hot
            </Link>
            <Link href="/visit" className="rounded-[40px_40px_40px_8px] border-[3px] border-ink bg-blush px-6 py-3.5 text-lg font-bold">
              Visit the shop
            </Link>
          </div>
        </div>
      </section>

      <Marquee className="bg-ink text-sun font-display text-2xl" items={["Lick the screen", "One of one", "No restocks", "Donate or consign", "XS to 6XL", "Come find it in store"]} />

      {/* Just in */}
      <section className="mx-auto max-w-6xl px-4 pt-16" aria-labelledby="just-in">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="just-in" className="drip-title text-[clamp(40px,6vw,72px)]">Just in</h2>
          <Link href="/shop?new=1" className="font-bold underline underline-offset-4">See everything new</Link>
        </div>
        <p className="mt-3 max-w-xl font-semibold">Most of these are one of one. When something sells, it flips to SOLD right here, live.</p>
        <div className="mt-10"><ProductGrid products={justIn} /></div>
      </section>

      {/* Vibe */}
      <section className="mx-auto max-w-6xl px-4 pt-24" aria-labelledby="vibe">
        <div className="drips rounded-[36px] border-[3px] border-ink bg-violet p-6 sm:p-10 text-violet">
          <h2 id="vibe" className="drip-title text-[clamp(36px,5vw,60px)]">Every kind of freak welcome</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VIBES.map((v) => (
              <li key={v.title} className="rounded-3xl border-[3px] border-ink bg-blush p-5 text-ink">
                <h3 className="font-display text-2xl">{v.title}</h3>
                <p className="mt-1">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Donate / visit */}
      <section className="mx-auto max-w-6xl px-4 pt-24 grid gap-6 md:grid-cols-2">
        <div className="rounded-[36px] border-[3px] border-ink bg-sun p-8 shadow-[6px_6px_0_var(--color-ink)]">
          <h2 className="drip-title-sm text-4xl">Got a closet full of chaos?</h2>
          <p className="mt-3 font-semibold">We take donations and consignment. Bring it by during open hours and we&apos;ll take a look.</p>
          <Link href="/contact" className="mt-5 inline-block font-bold underline underline-offset-4">Ask about consigning</Link>
        </div>
        <div className="on-ink rounded-[36px] border-[3px] border-ink bg-ink p-8 text-blush">
          <h2 className="font-display text-4xl text-sun">Come touch the fabric</h2>
          <p className="mt-3">{STORE.address.street}, Wichita. Open Monday to Saturday from noon, closed Sundays.</p>
          <Link href="/visit" className="mt-5 inline-block font-bold text-sun underline underline-offset-4">Hours &amp; directions</Link>
        </div>
      </section>
    </>
  );
}
