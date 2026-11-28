import type { Metadata } from "next";
import { getPublicProduct } from "@/lib/catalog";
import { ContactForm } from "@/components/ContactForm";
import { STORE } from "@/lib/store-info";

export const metadata: Metadata = { title: "Contact" };

export default async function Contact({ searchParams }: { searchParams: Promise<{ item?: string }> }) {
  const { item } = await searchParams;
  const product = item ? await getPublicProduct(item) : null;
  return (
    <div className="mx-auto max-w-5xl px-4 pt-12">
      <h1 className="drip-title text-[clamp(48px,8vw,104px)]">Slide into our DMs</h1>
      <div className="mt-10 grid gap-10 md:grid-cols-[1.4fr_1fr]">
        <ContactForm itemSku={product?.sku} itemName={product?.name} />
        <div className="grid gap-5 content-start font-semibold">
          <div className="rounded-3xl border-[3px] border-ink bg-sun p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider">Instagram</h2>
            <a className="font-display text-2xl underline underline-offset-4" href={`https://www.instagram.com/${STORE.instagram}/`} target="_blank" rel="noreferrer">@{STORE.instagram}</a>
          </div>
          <div className="rounded-3xl border-[3px] border-ink bg-blush p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider">Phone</h2>
            <p className="font-display text-2xl tabular-nums">{STORE.phone}</p>
            <p className="text-sm">Placeholder number for the demo.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
