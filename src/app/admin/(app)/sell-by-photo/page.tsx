import { PhotoSell } from "@/components/admin/PhotoSell";
import { hasClaude } from "@/lib/ai/server";
import { SQUARE } from "@/lib/square/server";

export const metadata = { title: "Sell by photo" };

export default function SellByPhoto() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-5xl">Sell by photo</h1>
        <p className="mt-2 max-w-2xl font-semibold">Tag fell off? Snap the item and the AI finds it in stock. You confirm, it&apos;s sold.</p>
      </div>
      <PhotoSell aiLive={hasClaude} squareConnected={Boolean(SQUARE)} />
    </div>
  );
}
