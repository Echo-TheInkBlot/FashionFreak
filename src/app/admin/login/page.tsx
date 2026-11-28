import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/inventory/server-repo";
import { LogoBadge } from "@/components/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata = { title: "Log in" };

export default function Login() {
  if (!hasSupabase) redirect("/admin");
  return (
    <main id="main" className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <LogoBadge size={140} priority className="border-[3px] border-ink" />
      <h1 className="font-display text-4xl">Staff login</h1>
      <LoginForm />
    </main>
  );
}
