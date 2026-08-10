# Database migrations

Apply these in order against the Supabase project, via the SQL editor or
`supabase db execute`. The application code tolerates an un-migrated database —
product reads fall back to a plain select, facets return empty, relations return
none — so deploying code before running these degrades features rather than
taking the catalogue down. But nothing new works until they are applied.

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
