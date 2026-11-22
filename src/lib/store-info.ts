// Real details from public listings (Nov 2026). Phone and owner story are placeholders until the owner confirms.
export const STORE = {
  name: "Fashion Freak",
  tagline: "Wichita's all-alternative thrift",
  address: { street: "1054 S Oliver Ave", city: "Wichita", state: "KS", zip: "67218" },
  phone: "(316) 555-0142", // placeholder
  instagram: "fashionfreakwichita",
  opened: "July 2023",
  sizes: "XS to 6XL",
  // 0 = Sunday. Times are 24h "HH:MM".
  hours: [
    { day: "Sunday", open: null, close: null },
    { day: "Monday", open: "12:30", close: "20:00" },
    { day: "Tuesday", open: "12:00", close: "20:00" },
    { day: "Wednesday", open: "12:00", close: "20:00" },
    { day: "Thursday", open: "12:00", close: "20:00" },
    { day: "Friday", open: "12:00", close: "20:00" },
    { day: "Saturday", open: "12:00", close: "20:00" },
  ] as { day: string; open: string | null; close: string | null }[],
  timezone: "America/Chicago",
} as const;

export const fullAddress = `${STORE.address.street}, ${STORE.address.city}, ${STORE.address.state} ${STORE.address.zip}`;
export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Fashion Freak ${fullAddress}`)}`;

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Open/closed right now in Wichita time. */
export function openStatus(now: Date = new Date()): { open: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE.timezone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  const mins = Number(get("hour")) * 60 + Number(get("minute"));
  const today = STORE.hours[dayIdx];
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  if (today.open && today.close && mins >= toMin(today.open) && mins < toMin(today.close)) {
    return { open: true, label: `Open now until ${formatTime(today.close)}` };
  }
  for (let i = 0; i < 7; i++) {
    const idx = (dayIdx + i) % 7;
    const d = STORE.hours[idx];
    if (!d.open) continue;
    if (i === 0 && mins >= toMin(d.open)) continue;
    const when = i === 0 ? "today" : i === 1 ? "tomorrow" : d.day;
    return { open: false, label: `Closed now. Opens ${when} at ${formatTime(d.open)}` };
  }
  return { open: false, label: "Closed" };
}
