import { describe, expect, it } from "vitest";
import { generateSku, normalizeSku, SKU_PATTERN } from "@/lib/inventory/sku";

describe("SKUs", () => {
  it("generates valid, readable SKUs", () => {
    for (let i = 0; i < 200; i++) {
      const sku = generateSku();
      expect(sku).toMatch(SKU_PATTERN);
      expect(sku.slice(3)).not.toMatch(/[01IO]/);
    }
  });
  it("normalizes scanner and typed input", () => {
    expect(normalizeSku("  ff-lv7drs\n")).toBe("FF-LV7DRS");
    expect(normalizeSku("FFLV7DRS")).toBe("FF-LV7DRS");
    expect(normalizeSku("hello")).toBeNull();
  });
});
