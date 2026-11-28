import { describe, expect, it } from "vitest";
import { applyFilters, filtersToQuery, parseFilters, sizeMatches } from "@/lib/catalog-filters";
import { openStatus } from "@/lib/store-info";
import type { Product } from "@/lib/inventory/types";

const mk = (o: Partial<Product>): Product => ({
  id: "x", sku: "FF-AAAA22", name: "Thing", description: "", category: "tops", size: "M", color: "red", tags: [],
  price_cents: 3000, quantity: 1, status: "available", is_one_of_a_kind: false, photos: [], ai_description: null,
  created_at: "2026-11-20T00:00:00Z", updated_at: "2026-11-20T00:00:00Z", sold_at: null, ...o,
});

describe("shop filters", () => {
  it("parses query params and ignores junk", () => {
    expect(parseFilters({ category: "dresses", max: "50", new: "1", color: "RED" }))
      .toMatchObject({ category: "dresses", maxPrice: 50, justIn: true, color: "red" });
    expect(parseFilters({ category: "spaceships", max: "-3" })).toMatchObject({ category: undefined, maxPrice: undefined });
  });
  it("round-trips to a query string", () => {
    expect(filtersToQuery({ category: "shoes", justIn: true })).toBe("?category=shoes&new=1");
    expect(filtersToQuery({})).toBe("");
  });
  it("filters by price, color, search and just-in", () => {
    const now = new Date("2026-11-22T00:00:00Z");
    const items = [mk({ id: "a", price_cents: 2000, tags: ["velvet"] }), mk({ id: "b", price_cents: 9000, color: "black", created_at: "2026-09-01T00:00:00Z" })];
    expect(applyFilters(items, { maxPrice: 50 }, now).map((p) => p.id)).toEqual(["a"]);
    expect(applyFilters(items, { color: "black" }, now).map((p) => p.id)).toEqual(["b"]);
    expect(applyFilters(items, { q: "VELVET" }, now).map((p) => p.id)).toEqual(["a"]);
    expect(applyFilters(items, { justIn: true }, now).map((p) => p.id)).toEqual(["a"]);
  });
  it("matches size ranges and one-size items", () => {
    expect(sizeMatches("XS-6X", "2X")).toBe(true);
    expect(sizeMatches("1X-3X", "M")).toBe(false);
    expect(sizeMatches("S/M", "M")).toBe(true);
    expect(sizeMatches("One size", "4X")).toBe(true);
    expect(sizeMatches("2XL", "2X")).toBe(true);
  });
});

describe("store hours", () => {
  it("knows when the shop is open (Wichita time)", () => {
    expect(openStatus(new Date("2026-11-24T19:00:00Z")).open).toBe(true);   // Tue 1 PM CST
    expect(openStatus(new Date("2026-11-22T18:00:00Z")).label).toBe("Closed now. Opens tomorrow at 12:30 PM"); // Sun noon
    expect(openStatus(new Date("2026-11-24T17:00:00Z")).label).toBe("Closed now. Opens today at 12 PM");   // Tue 11 AM
    expect(openStatus(new Date("2026-11-29T03:00:00Z")).label).toBe("Closed now. Opens Monday at 12:30 PM"); // Sat 9 PM
  });
});
