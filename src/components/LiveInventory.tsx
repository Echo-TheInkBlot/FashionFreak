"use client";
/**
 * Keeps product stock/status live on the storefront.
 * - With Supabase: subscribes to Realtime changes on `products` (RLS still applies to what we receive).
 * - Demo mode (no Supabase): listens on a BroadcastChannel so the demo admin in another tab can "sell" items.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Product, StoreSettings } from "@/lib/inventory/types";

export type LiveState = Pick<Product, "quantity" | "status" | "sold_at">;
type LiveMap = Record<string, LiveState>;

const Ctx = createContext<{ live: LiveMap; settings: Pick<StoreSettings, "sold_visible_days"> }>({
  live: {}, settings: { sold_visible_days: 3 },
});

export const DEMO_CHANNEL = "ff-inventory";

export function LiveInventoryProvider({
  settings, children,
}: { settings: Pick<StoreSettings, "sold_visible_days">; children: React.ReactNode }) {
  const [live, setLive] = useState<LiveMap>({});

  useEffect(() => {
    const apply = (row: Partial<Product> & { id?: string }) => {
      if (!row.id) return;
      setLive((m) => ({
        ...m,
        [row.id!]: { quantity: row.quantity ?? 0, status: row.status ?? "available", sold_at: row.sold_at ?? null },
      }));
    };

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let cleanup = () => {};

    if (url && key) {
      let cancelled = false;
      import("@/lib/supabase/client").then(({ supabaseBrowser }) => {
        if (cancelled) return;
        const sb = supabaseBrowser();
        const channel = sb
          .channel("public:products")
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "products" }, (p) => apply(p.new as Product))
          .subscribe();
        cleanup = () => { sb.removeChannel(channel); };
      });
      return () => { cancelled = true; cleanup(); };
    }

    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel(DEMO_CHANNEL);
      bc.onmessage = (e) => apply(e.data as Product);
      return () => bc.close();
    }
  }, []);

  const value = useMemo(() => ({ live, settings }), [live, settings]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The product merged with any live update we've received since the page loaded. */
export function useLiveProduct<T extends Product>(product: T): T {
  const { live } = useContext(Ctx);
  const l = live[product.id];
  return l ? { ...product, ...l } : product;
}

export function useLiveSettings() {
  return useContext(Ctx).settings;
}
