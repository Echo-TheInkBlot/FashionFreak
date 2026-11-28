import "server-only";
import { memoryRepo, supabaseRepo, type InventoryRepo } from "./repo";

/** True when Supabase env vars are set. Without them the app runs in demo mode on in-memory placeholder data. */
export const hasSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const g = globalThis as unknown as { __ffMemoryRepo?: InventoryRepo };
function demoRepo(): InventoryRepo {
  return (g.__ffMemoryRepo ??= memoryRepo());
}

/** Acts as the current visitor or logged-in staff member, so Row Level Security applies. */
export async function getRepo(): Promise<InventoryRepo> {
  if (!hasSupabase) return demoRepo();
  const { supabaseServer } = await import("../supabase/server");
  return supabaseRepo(await supabaseServer());
}

/** Trusted server code only (Square webhooks, nightly sync). Bypasses RLS. */
export async function getServiceRepo(): Promise<InventoryRepo> {
  if (!hasSupabase) return demoRepo();
  const { supabaseAdmin } = await import("../supabase/server");
  return supabaseRepo(supabaseAdmin());
}

export interface StaffUser { id: string | null; name: string; role: "owner" | "staff"; demo: boolean; }

/** The logged-in staff member, or null. In demo mode everyone is the demo owner. */
export async function getStaff(): Promise<StaffUser | null> {
  if (!hasSupabase) return { id: null, name: "Demo owner", role: "owner", demo: true };
  const { supabaseServer } = await import("../supabase/server");
  const db = await supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("staff").select("display_name, role").eq("user_id", user.id).maybeSingle();
  return data ? { id: user.id, name: data.display_name, role: data.role, demo: false } : null;
}
