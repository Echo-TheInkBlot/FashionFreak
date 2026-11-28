import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { memoryRepo } from "@/lib/inventory/repo";
import { squareClient, verifySquareSignature } from "@/lib/square/client";
import { applySquareCount, handleSquareWebhook, pushProductToSquare, reconcileWithSquare, squareAfterChange } from "@/lib/square/sync";
import type { SquareConfig } from "@/lib/square/config";

const LOC = "LOC1";
const cfg: SquareConfig = { token: "t", environment: "sandbox", locationId: LOC, webhookSignatureKey: "key", webhookUrl: "https://ff.test/api/square/webhook", apiVersion: "2025-10-16" };

async function linkedRepo() {
  const r = memoryRepo();
  const dress = (await r.getProductBySku("FF-LV7DRS"))!;      // one of a kind, qty 1
  const slip = (await r.getProductBySku("FF-SWRLSL"))!;       // qty 3
  await r.updateProduct(dress.id, { square_variation_id: "VAR-DRESS" });
  await r.updateProduct(slip.id, { square_variation_id: "VAR-SLIP" });
  return { r, dress, slip };
}
const countEvent = (id: string, variation: string, quantity: string, location = LOC) => ({
  event_id: id, type: "inventory.count.updated",
  data: { object: { inventory_counts: [{ catalog_object_id: variation, location_id: location, quantity, state: "IN_STOCK" }] } },
});

describe("Square -> site", () => {
  it("a sale on the iPad marks the one-of-a-kind SOLD", async () => {
    const { r, dress } = await linkedRepo();
    expect(await handleSquareWebhook(r, countEvent("e1", "VAR-DRESS", "0"), LOC)).toEqual(["sold 1 × FF-LV7DRS"]);
    expect(await r.getProduct(dress.id)).toMatchObject({ status: "sold", quantity: 0 });
    expect((await r.listEvents())[0]).toMatchObject({ method: "pos_webhook", note: "Sold on Square" });
  });
  it("a duplicate delivery is ignored", async () => {
    const { r } = await linkedRepo();
    await handleSquareWebhook(r, countEvent("e1", "VAR-SLIP", "2"), LOC);
    expect(await handleSquareWebhook(r, countEvent("e1", "VAR-SLIP", "2"), LOC)).toEqual(["ignored: duplicate delivery"]);
    expect((await r.getProductBySku("FF-SWRLSL"))!.quantity).toBe(2);
  });
  it("our own push echoing back is a no-op", async () => {
    const { r } = await linkedRepo();
    expect(await handleSquareWebhook(r, countEvent("e2", "VAR-SLIP", "3"), LOC)).toEqual(["no change (FF-SWRLSL)"]);
  });
  it("a refund on Square brings a sold item back", async () => {
    const { r, dress } = await linkedRepo();
    await handleSquareWebhook(r, countEvent("e3", "VAR-DRESS", "0"), LOC);
    expect(await handleSquareWebhook(r, countEvent("e4", "VAR-DRESS", "1"), LOC)).toEqual(["restocked 1 × FF-LV7DRS"]);
    expect(await r.getProduct(dress.id)).toMatchObject({ status: "available", quantity: 1, sold_at: null });
  });
  it("ignores other locations, unknown items, other event types and hidden items", async () => {
    const { r, slip } = await linkedRepo();
    expect(await applySquareCount(r, { variationId: "VAR-SLIP", quantity: 0, locationId: "OTHER" }, LOC)).toMatch(/other location/);
    expect(await applySquareCount(r, { variationId: "NOPE", quantity: 0, locationId: LOC }, LOC)).toMatch(/not a Fashion Freak item/);
    expect(await handleSquareWebhook(r, { event_id: "e5", type: "payment.created" }, LOC)).toEqual(["ignored: payment.created"]);
    await r.applyChange({ productId: slip.id, change: 0, method: "manual", confidence: null, note: null, setStatus: "hidden" });
    expect(await applySquareCount(r, { variationId: "VAR-SLIP", quantity: 1, locationId: LOC }, LOC)).toMatch(/hidden/);
  });
  it("never pushes a one-of-a-kind above 1", async () => {
    const { r } = await linkedRepo();
    expect(await applySquareCount(r, { variationId: "VAR-DRESS", quantity: 5, locationId: LOC }, LOC)).toMatch(/one of a kind/);
  });
});

describe("site -> Square", () => {
  function fakeFetch() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose JSON bodies in a test fake
    const calls: { url: string; body: any }[] = [];
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url.endsWith("/v2/catalog/object")) {
        return new Response(JSON.stringify({ catalog_object: { id: "ITEM1", item_data: { variations: [{ id: "VAR1" }] } } }));
      }
      if (url.endsWith("/v2/inventory/counts/batch-retrieve")) {
        return new Response(JSON.stringify({ counts: [{ catalog_object_id: "VAR-SLIP", state: "IN_STOCK", quantity: "1" }] }));
      }
      return new Response(JSON.stringify({}));
    });
    return { f: f as unknown as typeof fetch, calls };
  }

  it("creates the item with SKU, price and tracked inventory, then sets the count", async () => {
    const r = memoryRepo(); const p = (await r.getProductBySku("FF-SWRLSL"))!;
    const { f, calls } = fakeFetch();
    const updated = await pushProductToSquare(r, squareClient(cfg, f), p);
    expect(calls[0].url).toBe("https://connect.squareupsandbox.com/v2/catalog/object");
    const v = calls[0].body.object.item_data.variations[0].item_variation_data;
    expect(v).toMatchObject({ sku: "FF-SWRLSL", price_money: { amount: 4600, currency: "USD" }, track_inventory: true });
    expect(calls[1].body.changes[0].physical_count).toMatchObject({ catalog_object_id: "VAR1", quantity: "3", location_id: LOC });
    expect(updated).toMatchObject({ square_item_id: "ITEM1", square_variation_id: "VAR1", square_sync_error: null });
  });
  it("records a sync error on the product instead of failing", async () => {
    const r = memoryRepo(); const p = (await r.getProductBySku("FF-SWRLSL"))!;
    const f = vi.fn(async () => new Response(JSON.stringify({ errors: [{ detail: "Unauthorized" }] }), { status: 401 })) as unknown as typeof fetch;
    expect((await pushProductToSquare(r, squareClient(cfg, f), p)).square_sync_error).toBe("Unauthorized");
  });
  it("pushes the new count after a staff change", async () => {
    const { r, slip } = await linkedRepo();
    const { f, calls } = fakeFetch();
    await squareAfterChange(r, squareClient(cfg, f))({ ...slip, quantity: 7 }, {} as never);
    expect(calls[0].body.changes[0].physical_count).toMatchObject({ catalog_object_id: "VAR-SLIP", quantity: "7" });
  });
  it("nightly reconcile applies any drift", async () => {
    const { r } = await linkedRepo();
    const { f } = fakeFetch();
    const res = await reconcileWithSquare(r, squareClient(cfg, f), LOC);
    expect(res).toContain("sold 2 × FF-SWRLSL");
    expect(res).toContain("sold 1 × FF-LV7DRS"); // no count in Square means 0
  });
});

describe("webhook signature", () => {
  it("accepts Square's signature and rejects tampering", () => {
    const body = JSON.stringify(countEvent("e9", "VAR", "0"));
    const sig = createHmac("sha256", "key").update(cfg.webhookUrl + body).digest("base64");
    expect(verifySquareSignature(body, sig, cfg)).toBe(true);
    expect(verifySquareSignature(body + " ", sig, cfg)).toBe(false);
    expect(verifySquareSignature(body, null, cfg)).toBe(false);
  });
});
