// SKUs look like FF-7K3QXM: easy to read aloud, no 0/O or 1/I mix-ups, short enough for a small label.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateSku(random: () => number = Math.random, length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return `FF-${out}`;
}

export const SKU_PATTERN = /^FF-[A-Z0-9]{4,12}$/;

/** Normalizes what a barcode scanner or a person typed: trims, uppercases, fixes a missing dash. */
export function normalizeSku(input: string): string | null {
  const cleaned = input.trim().toUpperCase().replace(/\s+/g, "");
  const withDash = /^FF[A-Z0-9]{4,12}$/.test(cleaned) ? `FF-${cleaned.slice(2)}` : cleaned;
  return SKU_PATTERN.test(withDash) ? withDash : null;
}
