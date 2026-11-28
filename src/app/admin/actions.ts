"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORIES, type Category, type Product } from "@/lib/inventory/types";
import { getRepo, getStaff } from "@/lib/inventory/server-repo";
import { adjustStock, findBySku, InventoryError, recordSale, undoEvent } from "@/lib/inventory/service";
import { generateSku } from "@/lib/inventory/sku";
import { afterChangeFor, square, SQUARE } from "@/lib/square/server";
import { applySquareCount, pushProductToSquare, reconcileWithSquare } from "@/lib/square/sync";
import { storePhoto } from "@/lib/photos";

export interface ActionResult {
  ok: boolean;
  message: string;
  product?: Pick<Product, "id" | "quantity" | "status" | "sold_at">;
  eventId?: string;
}

async function staffOrThrow() {
  const staff = await getStaff();
  if (!staff) throw new InventoryError("Please log in as staff", "not_allowed");
  return staff;
}

const live = (p: Product | null) => (p ? { id: p.id, quantity: p.quantity, status: p.status, sold_at: p.sold_at } : undefined);

function refresh(p?: { sku?: string; id?: string }) {
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/shop");
  if (p?.sku) revalidatePath(`/shop/${p.sku}`);
}

function fail(e: unknown): ActionResult {
  return { ok: false, message: e instanceof Error ? e.message : "Something went wrong" };
}

export type StockAction = "sell_one" | "restock_one" | "mark_sold" | "hide" | "unhide" | "square_sale";

export async function stockAction(productId: string, action: StockAction): Promise<ActionResult> {
  try {
    const staff = await staffOrThrow();
    const repo = await getRepo();
    const after = afterChangeFor(repo);
    let eventId: string;
    let message: string;
    switch (action) {
      case "sell_one":
        eventId = (await recordSale(repo, { productId, method: "manual", staffUser: staff.id }, after)).id;
        message = "Sold one";
        break;
      case "restock_one":
        eventId = (await adjustStock(repo, { productId, change: 1, note: "Restocked", staffUser: staff.id }, after)).id;
        message = "Added one to stock";
        break;
      case "mark_sold":
        eventId = (await adjustStock(repo, { productId, change: 0, setStatus: "sold", note: "Marked sold", staffUser: staff.id }, after)).id;
        message = "Marked sold";
        break;
      case "hide":
        eventId = (await adjustStock(repo, { productId, change: 0, setStatus: "hidden", note: "Hidden from site", staffUser: staff.id }, after)).id;
        message = "Hidden from the website";
        break;
      case "unhide":
        eventId = (await adjustStock(repo, { productId, change: 0, setStatus: "available", note: "Back on site", staffUser: staff.id }, after)).id;
        message = "Back on the website";
        break;
      case "square_sale": {
        // Demo helper: behaves exactly like Square reporting a sale of one on the iPad.
        const p = await repo.getProduct(productId);
        if (!p) throw new InventoryError("Item not found", "not_found");
        const variationId = p.square_variation_id ?? `DEMO-${p.sku}`;
        if (!p.square_variation_id) await repo.updateProduct(p.id, { square_variation_id: variationId });
        const loc = SQUARE?.locationId ?? "DEMO";
        message = `Square says: ${await applySquareCount(repo, { variationId, quantity: Math.max(0, p.quantity - 1), locationId: loc }, loc)}`;
        eventId = (await repo.listEvents(1))[0]?.id;
        break;
      }
    }
    const p = await repo.getProduct(productId);
    refresh(p ?? undefined);
    return { ok: true, message, product: live(p), eventId };
  } catch (e) {
    return fail(e);
  }
}

export async function undoAction(eventId: string): Promise<ActionResult> {
  try {
    await staffOrThrow();
    const repo = await getRepo();
    const ev = await undoEvent(repo, eventId, afterChangeFor(repo));
    const p = await repo.getProduct(ev.product_id);
    refresh(p ?? undefined);
    return { ok: true, message: "Undone", product: live(p) };
  } catch (e) {
    return fail(e);
  }
}

export async function findSkuAction(formData: FormData) {
  await staffOrThrow();
  const raw = String(formData.get("sku") ?? "");
  let id: string | null = null;
  try { id = (await findBySku(await getRepo(), raw)).id; } catch { /* fall through to search */ }
  redirect(id ? `/admin/items/${id}` : `/admin/items?q=${encodeURIComponent(raw)}`);
}

function parseProductForm(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim();
  const category = String(fd.get("category") ?? "") as Category;
  const price = Number(fd.get("price"));
  const quantity = Number(fd.get("quantity") ?? 1);
  const oneOfAKind = fd.get("one_of_a_kind") === "on";
  if (!name) throw new InventoryError("Give the item a name", "invalid");
  if (!CATEGORIES.includes(category)) throw new InventoryError("Pick a category", "invalid");
  if (!Number.isFinite(price) || price < 0) throw new InventoryError("Enter a price", "invalid");
  if (!Number.isInteger(quantity) || quantity < 0) throw new InventoryError("Quantity must be a whole number", "invalid");
  return {
    name,
    description: String(fd.get("description") ?? "").trim(),
    category,
    size: String(fd.get("size") ?? "").trim() || null,
    color: String(fd.get("color") ?? "").trim().toLowerCase() || null,
    tags: String(fd.get("tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 12),
    price_cents: Math.round(price * 100),
    quantity: oneOfAKind ? Math.min(quantity, 1) : quantity,
    is_one_of_a_kind: oneOfAKind,
    ai_description: String(fd.get("ai_description") ?? "").trim() || null,
  };
}

export async function saveProductAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let id: string;
  try {
    await staffOrThrow();
    const repo = await getRepo();
    const fields = parseProductForm(fd);
    const existingId = String(fd.get("id") ?? "") || null;
    const photo = fd.get("photo");
    const hasPhoto = photo instanceof File && photo.size > 0;

    if (existingId) {
      const existing = await repo.getProduct(existingId);
      if (!existing) throw new InventoryError("Item not found", "not_found");
      const { quantity: _q, ...rest } = fields; // stock changes go through stock actions, not the edit form
      void _q;
      const photos = hasPhoto ? [await storePhoto(photo, existing.sku), ...existing.photos] : existing.photos;
      let p = await repo.updateProduct(existingId, { ...rest, photos });
      if (square) p = await pushProductToSquare(repo, square, p);
      id = p.id;
    } else {
      let sku = generateSku();
      for (let i = 0; i < 5 && (await repo.getProductBySku(sku)); i++) sku = generateSku();
      const photos = hasPhoto ? [await storePhoto(photo, sku)] : [];
      let p = await repo.createProduct({ ...fields, sku, photos, status: fields.quantity > 0 ? "available" : "sold" });
      if (square) p = await pushProductToSquare(repo, square, p);
      id = p.id;
    }
    refresh();
  } catch (e) {
    return fail(e);
  }
  redirect(`/admin/items/${id}?saved=1`);
}

export async function pushToSquareAction(productId: string): Promise<ActionResult> {
  try {
    await staffOrThrow();
    if (!square) return { ok: false, message: "Square isn't connected yet. Add the Square keys to the environment." };
    const repo = await getRepo();
    const p = await repo.getProduct(productId);
    if (!p) throw new InventoryError("Item not found", "not_found");
    const out = await pushProductToSquare(repo, square, p);
    refresh();
    return out.square_sync_error ? { ok: false, message: out.square_sync_error } : { ok: true, message: "Sent to Square" };
  } catch (e) {
    return fail(e);
  }
}

export async function pushAllToSquareAction(): Promise<ActionResult> {
  try {
    await staffOrThrow();
    if (!square) return { ok: false, message: "Square isn't connected yet." };
    const repo = await getRepo();
    const items = (await repo.listProducts()).filter((p) => p.status !== "sold");
    let failed = 0;
    for (const p of items) if ((await pushProductToSquare(repo, square, p)).square_sync_error) failed++;
    refresh();
    return { ok: failed === 0, message: `Sent ${items.length - failed} of ${items.length} items to Square` };
  } catch (e) {
    return fail(e);
  }
}

export async function reconcileAction(): Promise<ActionResult> {
  try {
    await staffOrThrow();
    if (!square || !SQUARE) return { ok: false, message: "Square isn't connected yet." };
    const changes = await reconcileWithSquare(await getRepo(), square, SQUARE.locationId);
    refresh();
    return { ok: true, message: changes.length ? changes.join("; ") : "Everything matches Square" };
  } catch (e) {
    return fail(e);
  }
}
