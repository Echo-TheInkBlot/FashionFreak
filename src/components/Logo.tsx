import Link from "next/link";

/** The shop's skull badge, used in the header, footer, hero and as the site icon. */
export function LogoBadge({ size, className = "", priority = false }: { size: number; className?: string; priority?: boolean }) {
  const src = size <= 80 ? "/brand/logo-160.webp" : size <= 256 ? "/brand/logo-512.webp" : "/brand/logo-1024.webp";
  return (
    <img
      src={src}
      width={size}
      height={size}
      alt="Fashion Freak logo: an iridescent mohawk skull on a swirling oil-slick badge"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={`rounded-full ${className}`}
    />
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group ${className}`} aria-label="Fashion Freak home">
      <span className="block rounded-full border-[3px] border-ink shadow-[3px_3px_0_var(--color-ink)] transition-transform group-hover:rotate-[-8deg]">
        <LogoBadge size={52} priority className="block" />
      </span>
      <span aria-hidden className="font-display text-[28px] leading-none text-sun [-webkit-text-stroke:1.5px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:3px_3px_0_var(--color-ink)]">
        Fashion Freak
      </span>
    </Link>
  );
}
