import Link from "next/link";
export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-20">
      <h1 className="drip-title text-6xl">Gone, baby, gone</h1>
      <p className="mt-6 text-lg font-semibold">That piece sold a while ago or was never here. Plenty more on the racks.</p>
      <Link href="/shop" className="mt-6 inline-block font-bold underline underline-offset-4">Back to the shop</Link>
    </div>
  );
}
