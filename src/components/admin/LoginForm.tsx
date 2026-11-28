"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const field = "w-full rounded-2xl border-[3px] border-ink bg-cream px-4 py-3 font-semibold";
  return (
    <form className="grid w-full gap-4" onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true); setError(null);
      const fd = new FormData(e.currentTarget);
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: String(fd.get("email")), password: String(fd.get("password")) });
      setBusy(false);
      if (error) return setError("That email and password didn't work.");
      router.replace("/admin"); router.refresh();
    }}>
      <div><label htmlFor="l-email" className="mb-1 block text-sm font-bold uppercase tracking-wider">Email</label>
        <input id="l-email" name="email" type="email" required autoComplete="email" className={field} /></div>
      <div><label htmlFor="l-pass" className="mb-1 block text-sm font-bold uppercase tracking-wider">Password</label>
        <input id="l-pass" name="password" type="password" required autoComplete="current-password" className={field} /></div>
      {error && <p role="alert" className="rounded-2xl bg-lip px-4 py-2 font-bold text-cream">{error}</p>}
      <button disabled={busy} className="rounded-2xl border-[3px] border-ink bg-sun px-4 py-3 text-lg font-bold shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-60">
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
