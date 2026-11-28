import { NextResponse } from "next/server";
import { reconcileWithSquare } from "@/lib/square/sync";
import { SQUARE, square } from "@/lib/square/server";
import { getServiceRepo } from "@/lib/inventory/server-repo";

/** Nightly safety net (Vercel Cron, see vercel.json). Protected by CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!SQUARE || !square) return NextResponse.json({ skipped: "Square is not configured" });
  const results = await reconcileWithSquare(await getServiceRepo(), square, SQUARE.locationId);
  return NextResponse.json({ ok: true, changes: results });
}
