"use client";
import type { ActionResult } from "@/app/admin/actions";

/** Demo mode: tell open storefront tabs about the change (Supabase Realtime does this in production). */
export function broadcastLive(result: ActionResult) {
  if (!result.product || typeof BroadcastChannel === "undefined") return;
  const bc = new BroadcastChannel("ff-inventory");
  bc.postMessage(result.product);
  bc.close();
}
