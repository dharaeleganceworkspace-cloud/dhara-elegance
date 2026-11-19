# PROJECT_PROGRESS

Last updated: 2026-11-17

## Status

Phase 1 (full code build) complete. `type-check`, `lint`, `test` and `build` all pass.
**Not yet done:** migration applied to the live Supabase project, end-to-end testing against real data.

## Stack

Next.js 16.4 (App Router, Turbopack, `src/proxy.ts` instead of middleware, `cacheComponents` OFF on purpose —
every store page reads the Supabase cookie session), React 19, Tailwind 4 (`@utility` classes in `globals.css`),
Framer Motion, Supabase (`@supabase/ssr`), zod.

## Done

- Brand: real logo `public/logo.png` (9337px original) → `logo-512.png` / `logo-192.png` / `src/app/icon.png`.
  `LogoMark` renders it as a CSS mask so it can be navy or gold.
- DB migration `supabase/migrations/20261117000000_initial_schema.sql`: all required tables + coupons, reviews,
  return_requests, order_notes, newsletter_subscribers; RLS on every table; storage bucket `product-images`
  (admin-only writes); functions `place_order`, `preview_coupon`, `admin_set_order_status` (valid transitions,
  idempotent cancel, single stock restore), `admin_adjust_stock`, `promote_to_admin` (SQL editor only).
- Storefront: home (19 sections, dynamic from DB, empty states), /men (navy/geometric), /women (cream/editorial),
  /search with filters, sort, pagination; product page with gallery (thumbs, fullscreen, hover zoom,
  click zoom, swipe, keyboard), variants, qty, wishlist, share, reviews, related, JSON-LD.
- Cart drawer + /cart, wishlist; guest localStorage; signed-in sync to DB; guest→account merge on sign-in.
- Checkout → `/api/orders` → `place_order` → WhatsApp link (`src/lib/whatsapp.ts`, tested) → /order/success.
- Auth: login, signup (email verification), forgot/reset password, `/auth/callback`.
- Account: profile, orders, order detail + timeline, return/exchange request, addresses, wishlist.
- Admin (`/admin/*`, `requireAdmin()` on every page + `getAdmin()` in every server action + RLS): dashboard,
  products (add/edit/delete/archive/activate, sizes, SEO), image manager (multi upload, replace, delete,
  reorder, primary, alt, zoom), orders + detail (status actions, notes, WhatsApp buttons), customers,
  inventory (available/reserved, adjustments, history), categories, settings (WhatsApp numbers, shipping),
  coupons, reviews moderation, returns, audit logs.
- SEO: metadata, canonical, OG, sitemap, robots, product + FAQ structured data.

## Next steps

1. Owner fills `.env.local` (URL + publishable key).
2. Apply migration to live Supabase (needs owner's OK).
3. Promote the first admin (see SETUP.md §4).
4. Run the customer + admin test flows from the spec against real data; check 360–1440px widths.

## Gotchas

- In PowerShell, never edit files with `Get-Content -Raw | Set-Content` — it corrupts ₹, —, → (use [IO.File] with UTF-8).
- Low-stock/customers lists aggregate in JS (marked `shortcut:` in code); move to SQL views if the catalogue grows past ~2000 products / 5000 orders.
