import "server-only";
import { hasSupabase } from "./inventory/server-repo";

const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Stores a product photo and returns its public URL. Demo mode keeps it in memory as a data URL. */
export async function storePhoto(file: File, sku: string): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error("Photos must be JPEG, PNG, WebP or HEIC");
  if (file.size > MAX_BYTES) throw new Error("Photos must be under 6 MB");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasSupabase) return `data:${file.type};base64,${bytes.toString("base64")}`;
  const { supabaseServer } = await import("./supabase/server");
  const db = await supabaseServer();
  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${sku}/${Date.now()}.${ext}`;
  const { error } = await db.storage.from("product-photos").upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return db.storage.from("product-photos").getPublicUrl(path).data.publicUrl;
}
