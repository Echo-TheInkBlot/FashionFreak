import { LogoBadge } from "@/components/Logo";

export const metadata = { title: "Staff" };
export default function Admin() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-20">
      <LogoBadge size={120} className="mb-6 border-[3px] border-ink" />
      <h1 className="drip-title text-6xl">Staff only</h1>
      <p className="mt-6 text-lg font-semibold">The staff app (login, barcode and photo selling) arrives in the next build phase.</p>
    </div>
  );
}
