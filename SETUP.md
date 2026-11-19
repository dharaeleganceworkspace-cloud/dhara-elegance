# Dhara Elegance — Setup

## 1. Environment

Copy `.env.example` to `.env.local` and fill in values from Supabase → Project Settings → API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000      # your real domain in production
```

No service-role key, payment keys or WhatsApp API keys are needed. `.env.local` is git-ignored.

## 2. Database

Run `supabase/migrations/20261117000000_initial_schema.sql` once, either:

- Supabase Dashboard → SQL Editor → paste the file → Run, or
- `npx supabase link --project-ref <ref>` then `npx supabase db push`.

It creates all tables, RLS policies, the `product-images` storage bucket, the order/stock functions and the Men/Women categories.

## 3. Supabase Auth settings

Authentication → URL Configuration:

- Site URL: your `NEXT_PUBLIC_SITE_URL`
- Redirect URLs: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`

## 4. Create the first super admin (no public admin signup exists)

1. Sign up normally on the website (`/signup`) with the admin's email and verify it.
2. In the Supabase SQL Editor run:

   ```sql
   select public.promote_to_admin('owner@example.com', 'super_admin');
   ```

   This function cannot be called from the website or API; only from the SQL editor.
3. Sign in at `/admin/login`.

To remove an admin: `delete from public.admin_users where user_id = (select id from auth.users where email = '...');`

## 5. First things to do in the admin

1. **Settings** → set the Business WhatsApp number (orders are blocked until it is set), shipping charge, free-shipping threshold.
2. **Products** → Add product → after creating, upload images on the edit page.

## 6. Run

```
npm install
npm run dev
```

Checks: `npm run type-check`, `npm run lint`, `npm test`, `npm run build`.

## 7. Deploy (Vercel)

Import the repo, add the three environment variables, deploy. Add the production `/auth/callback` URL in Supabase.

## How ordering works

Customer → cart → `/checkout` → **Place order on WhatsApp** → `POST /api/orders` → `place_order()` in Postgres
recalculates every price from the database, checks and reserves stock atomically, applies coupons, saves the
order as `pending_confirmation` and returns the snapshot → the server builds a `https://wa.me/<business>?text=…`
link → `/order/success` opens WhatsApp, with an "Open WhatsApp Again" fallback. No payment is collected or marked
as paid. Cancelling an order in the admin restores its stock exactly once.
