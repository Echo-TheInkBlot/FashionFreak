import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import bwipjs from "bwip-js/node";
import type { Product } from "./inventory/types";
import { formatPrice } from "./inventory/rules";

/**
 * Printable label sheet: US Letter, Avery 5160-compatible (3 × 10, 2.625" × 1").
 * Each label: Code 128 barcode of the SKU (Square POS finds the item when it's scanned), SKU text, name, price, size.
 */
const IN = 72;
const LAYOUT = { cols: 3, rows: 10, w: 2.625 * IN, h: 1 * IN, left: 0.1875 * IN, top: 0.5 * IN, gapX: 0.125 * IN };

export async function labelSheetPdf(products: Product[], copies = 1): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Fashion Freak labels");
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const small = await pdf.embedFont(StandardFonts.Helvetica);
  const labels = products.flatMap((p) => Array.from({ length: copies }, () => p));
  const perPage = LAYOUT.cols * LAYOUT.rows;

  for (let i = 0; i < Math.max(labels.length, 1); i += perPage) {
    const page = pdf.addPage([8.5 * IN, 11 * IN]);
    for (const [j, p] of labels.slice(i, i + perPage).entries()) {
      const col = j % LAYOUT.cols;
      const row = Math.floor(j / LAYOUT.cols);
      const x = LAYOUT.left + col * (LAYOUT.w + LAYOUT.gapX);
      const yTop = 11 * IN - LAYOUT.top - row * LAYOUT.h;
      const png = await bwipjs.toBuffer({ bcid: "code128", text: p.sku, scale: 3, height: 8, includetext: false });
      const img = await pdf.embedPng(png);
      const bw = LAYOUT.w * 0.52;
      const bh = LAYOUT.h * 0.56;
      page.drawImage(img, { x: x + 8, y: yTop - 8 - bh, width: bw, height: bh });
      page.drawText(p.sku, { x: x + 8, y: yTop - LAYOUT.h + 9, size: 8, font });
      const tx = x + bw + 14;
      const maxW = LAYOUT.w - bw - 20;
      page.drawText(formatPrice(p.price_cents), { x: tx, y: yTop - 22, size: 14, font, color: rgb(0.17, 0, 0.09) });
      page.drawText(fit(p.name, small, 7, maxW * 2), { x: tx, y: yTop - 36, size: 7, font: small, maxWidth: maxW, lineHeight: 8 });
      if (p.size) page.drawText(`Size ${p.size}`, { x: tx, y: yTop - LAYOUT.h + 9, size: 7, font: small });
    }
  }
  return pdf.save();
}

function fit(text: string, font: { widthOfTextAtSize(t: string, s: number): number }, size: number, max: number) {
  let t = text;
  while (t.length > 3 && font.widthOfTextAtSize(t, size) > max) t = t.slice(0, -2);
  return t === text ? t : `${t.trimEnd()}…`;
}
