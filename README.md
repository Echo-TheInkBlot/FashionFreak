# Fashion Freak (demo)

Demo storefront and real-time inventory for Fashion Freak, an independent hippie/alternative boutique in Wichita, KS.
**This is a demo build:** placeholder products and images, no payments, and a "Demo site" banner.

Stack: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, Storage, Realtime), Claude vision, Vercel.

> Status: phases (a) data model, (b) storefront and (c) staff app + Square sync are done. AI photo features and the full deploy guide come next.

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
2. Create a Supabase project. In the SQL editor, run the files in `supabase/migrations/` in order, then `supabase/seed.sql`.
   (Or with the Supabase CLI: `supabase link` then `supabase db reset`.)
3. `cp .env.example .env.local` and fill in the values from Supabase > Project settings > API.
4. Make yourself staff: create a user in Supabase > Authentication, then run
   `insert into staff (user_id, display_name, role) values ('<user id>', 'Your name', 'owner');`

## Tests
- `npm test`: unit tests for the sale/decrement rules, Square sync and webhook signatures, label sheets, storefront badge rules, shop filters, store hours, SKUs, the inventory service, and the AI confidence rules (including "the AI never sells on its own").
- `npm run test:db`: runs the migration, seed and SQL tests on a throwaway database (needs a local Postgres 15+; set `PGURL`). Covers RLS, overselling, undo, one-of-a-kind limits and the sold-visibility setting.

## How it works with Square (the shop's register)
The shop rings up sales on an iPad running Square, and money goes straight to the shop's Square account. This app never takes payments. Instead:

1. **Items are added in the staff app** (`/admin/items/new`). Saving creates the item on the website *and* in Square's item library, with its SKU, price, size and a tracked stock count.
2. **Labels** (`/admin/labels`) print a Code 128 barcode of each SKU on Avery 5160 sheets. Scanning a label on the Square iPad rings up that exact item. *The owner needs to scan tags instead of typing custom amounts:* a custom-amount sale doesn't say what sold, so the website can't update.
3. **When something sells on Square**, Square sends `inventory.count.updated` to `/api/square/webhook`. We compare Square's count with ours and record the difference through the same `recordSale()` function as everything else (method `pos_webhook`), so the listing flips to SOLD live. Refunds bring items back. Because we compare counts rather than replaying events, duplicate or late webhooks are harmless, and each event id is stored in `square_webhook_events`.
4. **Staff changes in our app** (restock, hide, mark sold, undo) push the new count to Square. Square echoes it back as a webhook, which is a no-op.
5. **Nightly safety net:** `/api/square/reconcile` (Vercel Cron, `vercel.json`) pulls every count from Square and applies any drift.

Code: `src/lib/square/` (REST client, webhook signature check, sync rules). Tests: `tests/square.test.ts`.

### Setting up Square (sandbox first)
1. Create an app at developer.squareup.com. Use the **Sandbox** credentials for the demo, so the shop's real account is never touched.
2. Set `SQUARE_ENVIRONMENT=sandbox`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`.
3. Webhooks > Add subscription: event `inventory.count.updated`, URL `https://<your site>/api/square/webhook`. Put its signature key in `SQUARE_WEBHOOK_SIGNATURE_KEY` and the exact URL in `SQUARE_WEBHOOK_URL`.
4. Set `CRON_SECRET` for the nightly check.
5. In the staff app, open Square and press **Send all items to Square** once.
6. Going live later: switch to the production token and location, and register the production webhook.

## Staff app (`/admin`)
Installable on a phone or tablet (Add to Home Screen; manifest at `public/staff.webmanifest`).

- **Today:** sold today and this week, low stock (restockable items only), recently added, Square sync status, latest activity with Undo.
- **Items:** search and filter, then each item has big stock buttons (Sold one, Restock, Mark all sold, Hide/Show) with an Undo banner, its Square status and its full history.
- **Add/edit item:** photo from the camera or library, details, price, one-of-a-kind flag. A new SKU is generated automatically. **Draft details from photo** fills in the name, description, category, color, tags and visual notes with Claude; staff edit before saving.
- **Sell by photo:** for an item with no tag. See below.
- **Scan to find:** a USB or Bluetooth barcode scanner works anywhere in the staff app and jumps to the scanned item.
- **Activity:** the full audit log. Undo is refused if the item changed afterwards, so it never wipes out a later sale.
- **Login:** Supabase email + password; only users in the `staff` table get in. In demo mode there's no login, and data lives in memory (it resets on restart). A "Demo: simulate Square sale" button acts exactly like a webhook from the iPad.

## AI photo features (Claude)
Code: `src/lib/ai/`. Tests: `tests/ai.test.ts`.

- **Draft a listing** (`draftListing`): one photo in, a structured JSON draft out (name, description, category, color, tags, visual notes, size only if a tag is readable). Nothing is saved until staff press Save.
- **Sell by photo** (`/admin/sell-by-photo`, `lookupByPhoto`):
  1. Pre-filter: the staff's category pick, or the AI's read of the photo (category, color, visual notes), ranks the sellable items. The top 8 go to the model.
  2. Match: the photo and those candidates (details plus listing photo) go to Claude, which returns JSON with `best_match_id`, `confidence` (0 to 1) and up to 3 alternatives. Ids not in the candidate list are thrown away.
  3. Confidence rules (`decideMatchUi`): at or above `store_settings.ai_confidence_threshold` (default 0.85) staff see one big **Confirm sold** button; below it they see the top 3 side by side plus a search box. The threshold can't be set below 0.5.
  4. **The AI never marks anything sold.** The lookup only reads inventory (a test checks stock and the event log are untouched even at 99% confidence). A sale is recorded only when staff tap, through `recordSale` with method `photo_ai` and the confidence, so it shows in Activity and can be undone. When Square is connected, the screen also shows the SKU to ring up on the iPad.
- Photos are shrunk in the browser (1568 px JPEG) before upload, keeping uploads fast and under the API's 5 MB image limit.
- Model: `claude-opus-5-5` (override with `ANTHROPIC_MODEL`), structured outputs, effort `low` for drafts and `medium` for matching. Requests opt into Anthropic's server-side fallback (`fallbacks: "default"`), so if the model declines a photo the API retries it on a recommended fallback model; if that also declines, staff get a "fill it in by hand" message.
- **No `ANTHROPIC_API_KEY`?** The demo uses a simulated responder, and every screen says "Simulated". A demo toggle switches between a sure and an unsure match so both screens can be shown.

**Rough Claude cost** (Opus 5.5 at $4 / $20 per million input / output tokens): about 3¢ per listing draft, and 10 to 20¢ per photo lookup (one photo plus up to 8 candidate photos; picking the category first skips the extra draft step). 200 new items and 100 photo lookups a month comes to about $20.
