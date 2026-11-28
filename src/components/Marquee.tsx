export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const text = items.join("  💋  ") + "  💋  ";
  return (
    <div className={`marquee ${className}`} aria-hidden>
      <span>{text.repeat(4)}</span>
    </div>
  );
}
