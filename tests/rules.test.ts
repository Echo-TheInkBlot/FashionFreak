import { describe, expect, it } from "vitest";
import { applyStockChange, displayStatus, formatPrice, InventoryRuleError } from "@/lib/inventory/rules";

const base = { sku: "FF-TEST01", quantity: 3, status: "available" as const, is_one_of_a_kind: false };

describe("applyStockChange (sale / decrement rules)", () => {
  it("decrements and stays available while stock remains", () => {
    expect(applyStockChange(base, { change: -1 })).toEqual({ quantity: 2, status: "available", becameSold: false });
  });
  it("marks sold when the last one sells", () => {
    expect(applyStockChange({ ...base, quantity: 1 }, { change: -1 })).toEqual({ quantity: 0, status: "sold", becameSold: true });
  });
  it("refuses to sell more than is in stock", () => {
    expect(() => applyStockChange(base, { change: -4 })).toThrow(InventoryRuleError);
  });
  it("refuses to sell a sold or hidden item", () => {
    expect(() => applyStockChange({ ...base, quantity: 0, status: "sold" }, { change: -1 })).toThrow(/cannot be sold/);
    expect(() => applyStockChange({ ...base, status: "hidden" }, { change: -1 })).toThrow(/cannot be sold/);
  });
  it("restocking a sold item makes it available again", () => {
    expect(applyStockChange({ ...base, quantity: 0, status: "sold" }, { change: 2 })).toMatchObject({ quantity: 2, status: "available" });
  });
  it("one-of-a-kind items can never exceed 1", () => {
    expect(() => applyStockChange({ ...base, quantity: 1, is_one_of_a_kind: true }, { change: 1 })).toThrow(/one-of-a-kind/);
  });
  it("manual 'mark sold' zeroes the remaining stock", () => {
    expect(applyStockChange(base, { change: 0, setStatus: "sold" })).toEqual({ quantity: 0, status: "sold", becameSold: true });
  });
  it("hiding keeps quantity", () => {
    expect(applyStockChange(base, { change: 0, setStatus: "hidden" })).toMatchObject({ quantity: 3, status: "hidden" });
  });
  it("rejects fractional changes", () => {
    expect(() => applyStockChange(base, { change: -0.5 })).toThrow(/whole number/);
  });
});

describe("displayStatus (storefront badge)", () => {
  const now = new Date("2026-11-22T12:00:00Z");
  const s = { sold_visible_days: 3 };
  it("shows In Stock / Only 1 Left", () => {
    expect(displayStatus({ quantity: 4, status: "available", sold_at: null }, s, now)).toBe("in_stock");
    expect(displayStatus({ quantity: 1, status: "available", sold_at: null }, s, now)).toBe("only_one_left");
  });
  it("shows Sold for a few days, then hides it", () => {
    expect(displayStatus({ quantity: 0, status: "sold", sold_at: "2026-11-20T12:00:00Z" }, s, now)).toBe("sold");
    expect(displayStatus({ quantity: 0, status: "sold", sold_at: "2026-11-19T11:59:00Z" }, s, now)).toBeNull();
  });
  it("respects the days setting", () => {
    expect(displayStatus({ quantity: 0, status: "sold", sold_at: "2026-11-16T12:00:00Z" }, { sold_visible_days: 7 }, now)).toBe("sold");
  });
  it("never shows hidden items", () => {
    expect(displayStatus({ quantity: 2, status: "hidden", sold_at: null }, s, now)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("drops cents on whole dollars", () => {
    expect(formatPrice(6800)).toBe("$68");
    expect(formatPrice(6850)).toBe("$68.50");
  });
});
