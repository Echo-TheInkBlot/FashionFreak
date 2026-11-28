import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PDFDocument } from "pdf-lib";
import { labelSheetPdf } from "@/lib/labels";
import { demoProducts } from "@/lib/demo/demo-products";

describe("label sheet", () => {
  it("fits 30 labels per page", async () => {
    const products = demoProducts().slice(0, 16);
    const bytes = await labelSheetPdf(products, 2); // 32 labels
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(2);
  });
});
