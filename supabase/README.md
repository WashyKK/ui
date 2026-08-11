# Database migrations

Apply these in order against the Supabase project, via the SQL editor or
`supabase db execute`. The application code tolerates an un-migrated database —
product reads fall back to a plain select, facets return empty, relations return
none — so deploying code before running these degrades features rather than
taking the catalogue down. But nothing new works until they are applied.

## The short way

Run `migrate_all.sql`. It is every migration below concatenated in dependency
order, and every statement in it is idempotent — re-running one you have already
applied is a no-op, so you do not need to track which is which. Paste it into the
Supabase SQL editor once.

| # | File | What it does |
|---|------|--------------|
| 1 | `decrement_stock.sql` | Atomic stock decrement. Replaces a read-then-write that lost a decrement when two orders landed together. **Apply before deploying**, or the fallback path keeps the race open. |
| 2 | `environment_column.sql` | Tags orders `test`/`live` and backfills everything existing to `test`. Do this before real keys go in, or test rows become indistinguishable from revenue. |
| 3 | `orders_canonical.sql` | Makes `orders` the single order model: `order_number`, `provider`, `status`, `items` jsonb, `fx_rate_usd_kes`. Drops the `NOT NULL` on `product_id` that multi-item carts have always violated. |
| 4 | `orders_fulfilment.sql` | Kenyan delivery address, B2B fields, carrier/tracking, and the `order_events` audit table. |
| 5 | `contact_messages.sql` | Quote and support enquiries. |
| 6 | `catalog_depth.sql` | `sku`/`mpn`/`manufacturer`, `product_images`, `category_id` as a real FK with rename-safe triggers, and `product_relations`. |
| 7 | `product_slugs.sql` | Readable product URLs, backfilled, plus a full-text search index. |
| 8 | `alerts_and_attributes.sql` | Back-in-stock alerts, and the spec attribute vocabulary + values that drive faceting. |
| 9 | `platform_admins.sql` | Lets `user_roles` hold `admin`, so you can grant staff access from the admin panel instead of the database. |
| 10 | `category_tree.sql` | `categories.parent_id` and a recursive path function — Motors > DC > Stepper. |
| 11 | `product_resources.sql` | `product_documents`, `product_links`, `product_snippets`: several datasheets, helpful links, and usage code per product. |
| 12 | `product_status.sql` | `listed` / `unlisted` / `archived`. This is what lets you pull a product from the catalogue without deleting it — deleting one that has ever been ordered violates `orders_product_id_fkey`. |
| 13 | `analytics.sql` | Cookieless page views and search events, keyed on a daily-rotating salted hash. Feeds the Analytics tab, including searches that returned nothing. |
| 14 | `discounts.sql` | `sale_price`, `sale_starts_at`, `sale_ends_at` — a scheduled discount per product, priced server-side. |
| 15 | `sourcing_requests.sql` | "Can you get me X" enquiries, tracked from new through quoted to won or lost. |
| 16 | `gift_cards.sql` | Store credit in KSh, with `redeem_gift_card()` taking a row lock so a card cannot be spent twice by two concurrent checkouts. |
| 17 | `product_questions.sql` | What people ask the product assistant. Doubles as its rate-limit store and as a demand signal. |

Order matters in one place: `catalog_depth` before `product_slugs`, because
slugs are built from `mpn`. The bundle already has them that way.

`products.sql` and `orders.sql` are the original table definitions and are
already applied — they are kept for reference, and note that `orders.sql` no
longer describes the live table (see #3).

## Environment variables

Set alongside these:

| Variable | Needed for |
|---|---|
| `RESEND_API_KEY` | Any email at all. Without it order confirmations and back-in-stock alerts silently no-op — the code logs a warning and returns. |
| `MPESA_CALLBACK_SECRET` | Authenticating the Daraja callback. Unset, it falls back to pending-status correlation only, which does not stop an attacker who guesses a live `CheckoutRequestID` inside the payment window. |
| `PAYSTACK_SECRET_KEY` | Turns on the unified M-Pesa + card checkout. Until it is set, `/checkout` shows the legacy Stripe and Daraja buttons. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, OG images and the sitemap. Set it to `https://elffie.com` — Cloudflare fronts Vercel, so `VERCEL_URL` is a deployment host, not the public one. |
| `USD_TO_KES_RATE` / `NEXT_PUBLIC_USD_TO_KES_RATE` | The charged and displayed rate. Keep them equal. |
| `OPENAI_API_KEY` | The "Ask about this part" box on product pages. Unset, the box is not rendered at all rather than being shown broken. |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-4o-mini`. |
| `OPENAI_BASE_URL` | Optional. Any OpenAI-compatible endpoint. |
