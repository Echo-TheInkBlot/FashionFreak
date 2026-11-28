import { NextResponse } from "next/server";
import { verifySquareSignature } from "@/lib/square/client";
import { handleSquareWebhook } from "@/lib/square/sync";
import { SQUARE } from "@/lib/square/server";
import { getServiceRepo } from "@/lib/inventory/server-repo";

/**
 * Square calls this on every inventory change (register the URL in the Square Developer Dashboard,
 * subscribed to inventory.count.updated). Sales rung up by scanning a tag on the iPad flip the item to SOLD here.
 */
export async function POST(req: Request) {
  if (!SQUARE) return NextResponse.json({ error: "Square is not configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifySquareSignature(raw, req.headers.get("x-square-hmacsha256-signature"), SQUARE)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  let event: unknown;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }
  const results = await handleSquareWebhook(await getServiceRepo(), event as never, SQUARE.locationId);
  return NextResponse.json({ ok: true, results });
}
