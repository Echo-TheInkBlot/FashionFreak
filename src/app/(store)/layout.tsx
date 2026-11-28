import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LiveInventoryProvider } from "@/components/LiveInventory";
import { getSettings } from "@/lib/catalog";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <SiteHeader />
      <LiveInventoryProvider settings={{ sold_visible_days: settings.sold_visible_days }}>
        <main id="main" className="flex-1">{children}</main>
      </LiveInventoryProvider>
      <SiteFooter />
    </>
  );
}
