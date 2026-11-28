import Link from "next/link";
import { Logo } from "./Logo";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?new=1", label: "Just in" },
  { href: "/about", label: "Our story" },
  { href: "/visit", label: "Visit" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-pink/90 backdrop-blur border-b-[3px] border-ink">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Logo />
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-x-1 gap-y-1 font-bold">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-block rounded-full px-3 py-1.5 hover:bg-ink hover:text-sun transition-colors">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
