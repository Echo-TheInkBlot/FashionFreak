import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/inventory/server-repo";
import { SQUARE } from "@/lib/square/server";
import { LogoBadge } from "@/components/Logo";
import { ScanBox } from "@/components/admin/ScanBox";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/items", label: "Items" },
  { href: "/admin/items/new", label: "+ Add item" },
  { href: "/admin/sell-by-photo", label: "Sell by photo" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/labels", label: "Labels" },
  { href: "/admin/square", label: "Square" },
];

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return (
    <>
      <header className="on-ink sticky top-0 z-40 bg-ink text-blush">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoBadge size={40} priority />
            <span className="font-display text-xl text-sun">Staff</span>
          </Link>
          <nav aria-label="Staff" className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto">
            <ul className="flex gap-1 font-bold whitespace-nowrap">
              {NAV.map((n) => (
                <li key={n.href}><Link href={n.href} className="inline-block rounded-full px-3 py-1.5 hover:bg-sun hover:text-ink">{n.label}</Link></li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <ScanBox />
            <span className={`hidden rounded-full px-2.5 py-1 text-xs font-bold md:inline ${SQUARE ? "bg-violet text-sun" : "bg-blush/20 text-blush"}`}>
              {SQUARE ? `Square ${SQUARE.environment}` : "Square not connected"}
            </span>
            {!staff.demo && <SignOutButton />}
          </div>
        </div>
        {staff.demo && (
          <p className="bg-sun px-4 py-1.5 text-center text-sm font-bold text-ink">
            Demo mode: no login, placeholder data kept in memory. Changes reset when the server restarts.
          </p>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
