import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { memoryRepo, supabaseRepo } from "@/lib/inventory/repo";
import { adjustStock, InventoryError, recordSale, recordSaleBySku, undoEvent } from "@/lib/inventory/service";

const repo = () => memoryRepo();
const bySku = async (r: ReturnType<typeof memoryRepo>, sku: string) => (await r.getProductBySku(sku))!;

describe("inventory service (demo repo, same rules as the database)", () => {
  it("sells one and logs the event", async () => {
    const r = repo(); const p = await bySku(r, "FF-SWRLSL");
    const ev = await recordSale(r, { productId: p.id, method: "barcode" });
    expect(ev).toMatchObject({ change: -1, quantity_before: 3, quantity_after: 2, method: "barcode" });
    expect((await r.listEvents())[0].id).toBe(ev.id);
  });
  it("marks a one-of-a-kind sold, refuses a second sale, and undo restores it", async () => {
    const r = repo(); const p = await bySku(r, "FF-LV7DRS");
    const ev = await recordSale(r, { productId: p.id, method: "manual" });
    expect(await bySku(r, "FF-LV7DRS")).toMatchObject({ quantity: 0, status: "sold" });
    await expect(recordSale(r, { productId: p.id, method: "manual" })).rejects.toMatchObject({ code: "rule" });
    await undoEvent(r, ev.id);
    expect(await bySku(r, "FF-LV7DRS")).toMatchObject({ quantity: 1, status: "available", sold_at: null });
    await expect(undoEvent(r, ev.id)).rejects.toThrow(/already undone/);
  });
  it("won't undo over a later change", async () => {
    const r = repo(); const p = await bySku(r, "FF-TDHLTR");
    const first = await recordSale(r, { productId: p.id, method: "manual" });
    await recordSale(r, { productId: p.id, method: "manual" });
    await expect(undoEvent(r, first.id)).rejects.toThrow(/changed since/);
  });
  it("requires a confidence for photo matches", async () => {
    const r = repo(); const p = await bySku(r, "FF-SWRLSL");
    await expect(recordSale(r, { productId: p.id, method: "photo_ai" })).rejects.toThrow(/confidence/);
  });
  it("sells by a messy scanned SKU and reports unknown ones", async () => {
    const r = repo();
    const { product } = await recordSaleBySku(r, " fflv7drs\n");
    expect(product.sku).toBe("FF-LV7DRS");
    await expect(recordSaleBySku(r, "FF-NOPE99")).rejects.toBeInstanceOf(InventoryError);
  });
  it("calls afterChange for staff changes so Square can be updated", async () => {
    const r = repo(); const p = await bySku(r, "FF-SWRLSL");
    const after = vi.fn(async () => {});
    await adjustStock(r, { productId: p.id, change: 2 }, after);
    expect(after).toHaveBeenCalledWith(expect.objectContaining({ quantity: 5 }), expect.objectContaining({ change: 2 }));
  });
  it("does not push Square-origin sales back to Square", async () => {
    const r = repo(); const p = await bySku(r, "FF-SWRLSL");
    const after = vi.fn(async () => {});
    await recordSale(r, { productId: p.id, method: "pos_webhook" }, after);
    expect(after).not.toHaveBeenCalled();
  });
});

describe("supabase repo", () => {
  it("calls the database function and maps permission errors", async () => {
    const rpc = vi.fn(async () => ({ data: null, error: { code: "42501", message: "Only staff" } }));
    const r = supabaseRepo({ rpc } as unknown as SupabaseClient);
    await expect(r.applyChange({ productId: "p1", change: -1, method: "barcode", confidence: null, note: null }))
      .rejects.toMatchObject({ code: "not_allowed" });
    expect(rpc).toHaveBeenCalledWith("apply_inventory_change", expect.objectContaining({ p_product_id: "p1", p_change: -1 }));
  });
});
