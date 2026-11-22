import Link from "next/link";

/** Placeholder wordmark until the owner's logo arrives. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 group ${className}`} aria-label="Fashion Freak home">
      <span aria-hidden className="lips block w-11 group-hover:animate-none" />
      <span className="font-display text-[28px] leading-none text-sun [-webkit-text-stroke:1.5px_var(--color-ink)] [paint-order:stroke_fill] [text-shadow:3px_3px_0_var(--color-ink)]">
        Fashion Freak
      </span>
    </Link>
  );
}
