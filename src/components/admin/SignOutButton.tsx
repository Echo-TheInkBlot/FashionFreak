"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button type="button" className="font-bold underline underline-offset-4"
      onClick={async () => { await supabaseBrowser().auth.signOut(); router.replace("/admin/login"); router.refresh(); }}>
      Sign out
    </button>
  );
}
