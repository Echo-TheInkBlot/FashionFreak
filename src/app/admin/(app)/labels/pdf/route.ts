import { NextResponse } from "next/server";
import { getRepo, getStaff } from "@/lib/inventory/server-repo";
import { labelSheetPdf } from "@/lib/labels";

export async function GET(req: Request) {
  if (!(await getStaff())) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const url = new URL(req.url);
  const ids = new Set(url.searchParams.getAll("id").flatMap((s) => s.split(",")));
  const copies = Math.min(10, Math.max(1, Number(url.searchParams.get("copies")) || 1));
  const products = (await (await getRepo()).listProducts()).filter((p) => ids.has(p.id));
  if (!products.length) return NextResponse.json({ error: "Pick at least one item" }, { status: 400 });
  const pdf = await labelSheetPdf(products, copies);
  return new NextResponse(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="fashion-freak-labels.pdf"` },
  });
}
