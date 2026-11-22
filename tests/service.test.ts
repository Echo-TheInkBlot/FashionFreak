import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InventoryError, recordSale, recordSaleBySku } from "@/lib/inventory/service";

function fakeDb(opts: { rpcError?: { code: string; message: string }; product?: object | null } = {}) {
  const rpc = vi.fn(async () => (opts.rpcError ? { data: null, error: opts.rpcError } : { data: { id: "ev1", change: -1 }, error: null }));
  const maybeSingle = vi.fn(async () => ({ data: opts.product ?? null, error: null }));
  const db = { rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) } as unknown as SupabaseClient;
  return { db, rpc };
}

describe("recordSale service", () => {
  it("calls the database function with a -1 change", async () => {
    const { db, rpc } = fakeDb();
    await recordSale(db, { productId: "p1", method: "barcode" });
    expect(rpc).toHaveBeenCalledWith("apply_inventory_change", expect.objectContaining({ p_product_id: "p1", p_change: -1, p_method: "barcode" }));
  });
  it("requires a confidence for photo matches", async () => {
    const { db, rpc } = fakeDb();
    await expect(recordSale(db, { productId: "p1", method: "photo_ai" })).rejects.toThrow(/confidence/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("maps permission errors to a friendly message", async () => {
    const { db } = fakeDb({ rpcError: { code: "42501", message: "Only staff" } });
    await expect(recordSale(db, { productId: "p1", method: "barcode" })).rejects.toMatchObject({ code: "not_allowed" });
  });
  it("sells by SKU after normalizing the scan", async () => {
    const { db, rpc } = fakeDb({ product: { id: "p9", sku: "FF-LV7DRS" } });
    const res = await recordSaleBySku(db, "fflv7drs");
    expect(res.product.id).toBe("p9");
    expect(rpc).toHaveBeenCalledWith("apply_inventory_change", expect.objectContaining({ p_product_id: "p9" }));
  });
  it("reports unknown SKUs", async () => {
    const { db } = fakeDb({ product: null });
    await expect(recordSaleBySku(db, "FF-NOPE99")).rejects.toBeInstanceOf(InventoryError);
  });
});
