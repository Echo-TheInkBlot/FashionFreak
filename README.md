# Fashion Freak (demo)

Demo storefront and real-time inventory for Fashion Freak, an independent hippie/alternative boutique in Wichita, KS.
**This is a demo build:** placeholder products and images, no payments, and a "Demo site" banner.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, Storage, Realtime), Claude vision, Vercel.

> Status: phases (a) data model + seed and (b) storefront are done. Admin, AI features and the full deploy guide come next.

## Run it locally (no setup needed)
```bash
npm install
npm run dev   # http://localhost:3000
```
Without Supabase env vars the site runs in **demo data mode** on the 30 built-in placeholder products. To see a live SOLD flip in demo mode, open the shop in one tab and run this in another tab's browser console:
```js
new BroadcastChannel("ff-inventory").postMessage({ id: "FF-MRGMXI", quantity: 0, status: "sold", sold_at: new Date().toISOString() })
```
With Supabase configured, the same flip happens through Supabase Realtime whenever stock changes.

## Storefront
Design direction: **Lava Lips** (hot pink, molten lava-lamp blobs, floating lips, drippy Rubik Wet Paint headlines, Karla body text, grain overlay). Motion respects `prefers-reduced-motion`.

| Page | Notes |
| --- | --- |
| `/` | Hero with live open/closed status, marquee, Just in grid, store vibe, donate/visit |
| `/shop` | Filters: category, size (understands ranges like XS-6X), color, max price, just in (14 days), search. Plain GET form, so it works without JavaScript |
| `/shop/[sku]` | Photo, live status, details, "Ask about this item" and "Come find it in store" |
| `/about`, `/visit`, `/contact` | Story (placeholder copy), real address and hours with today highlighted, map placeholder, demo contact form |

- Live status: `src/components/LiveInventory.tsx` merges Realtime updates into every card. Cards show In stock / Only 1 left / Sold with a SOLD stamp, and disappear once past `sold_visible_days` or if staff hide them.
- Logo: the shop's skull badge in `public/brand/` (header, footer, hero, site icon, social preview). Store details live in `src/lib/store-info.ts` (address and hours from public listings; phone is a placeholder).
- Checkout seam: `src/lib/commerce/index.ts`. The demo uses an "in store" provider; a Stripe or Square provider can be dropped in later.

## Data model

All schema lives in `supabase/migrations/0001_init.sql`.

| Table | What it holds |
| --- | --- |
| `products` | sku, name, description, category, size, color, tags, price_cents, quantity, status (`available` / `sold` / `hidden`), is_one_of_a_kind, photos[], ai_description (visual notes for photo matching), created_at, sold_at |
| `inventory_events` | Audit log. One row per stock change: change, before/after quantity and status, method (`barcode` / `photo_ai` / `manual` / `pos_webhook` / `undo`), confidence (AI), staff_user, links between an event and its undo |
| `store_settings` | One row: `sold_visible_days` (how long SOLD items stay on the site, default 3), `ai_confidence_threshold` (default 0.85), `low_stock_threshold` |
| `staff` | Which Supabase Auth users are staff, and who is the owner |

**Every stock change goes through one database function**, `apply_inventory_change()`. It locks the product row, applies the rules (no overselling, one-of-a-kind max 1, sold when quantity hits 0, `sold_at` stamped), and writes the audit event in the same transaction. `undo_inventory_event()` reverses an event, and refuses if the product has changed since (so an undo never wipes out a later sale). Logged-in users can't edit quantity or status directly; a trigger blocks it.

In app code, the only way in is `src/lib/inventory/service.ts` (`recordSale`, `recordSaleBySku`, `adjustStock`, `undoEvent`).

### Row Level Security
- Anyone can read products that are `available`, or `sold` within the last `sold_visible_days` days.
- Only staff can read hidden products, read the event log, add or edit products, or upload photos.
- Only staff, or trusted server code using the service-role key, can change stock.

### Realtime
`products` is added to the `supabase_realtime` publication, so the storefront can subscribe and flip a card to SOLD without a refresh.

## Seed data
30 placeholder products across dresses, tops, denim, jackets, accessories, jewelry, vintage and shoes. Some are one-of-a-kind and five are sold (one sold 6 days ago, so it's already past the 3-day window and hidden from the public).

- Source: `src/lib/demo/seed-data.ts`
- Regenerate `supabase/seed.sql` and the placeholder images in `public/placeholders/`: `npm run seed:generate`

## Setup (so far)
1. `npm install`
2. Create a Supabase project. In the SQL editor, run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
   (Or with the Supabase CLI: `supabase link` then `supabase db reset`.)
3. `cp .env.example .env.local` and fill in the values from Supabase > Project settings > API.
4. Make yourself staff: create a user in Supabase > Authentication, then run
   `insert into staff (user_id, display_name, role) values ('<user id>', 'Your name', 'owner');`

## Tests
- `npm test`: unit tests for the sale/decrement rules, storefront badge rules, shop filters, store hours, SKUs and the sale service.
- `npm run test:db`: runs the migration, seed and SQL tests on a throwaway database (needs a local Postgres 15+; set `PGURL`). Covers RLS, overselling, undo, one-of-a-kind limits and the sold-visibility setting.

## Future: syncing sales from a POS
If the owner uses Square, Shopify POS or Clover, the cleanest long-term setup is to have the POS send a webhook on each sale. A small API route would verify the webhook signature, map the POS item to our SKU, and call `recordSale(supabaseAdmin(), { productId, method: "pos_webhook", note: "<order id>" })`. Nothing else needs to change, because every sale already goes through that one function, and the website updates live the same way.
