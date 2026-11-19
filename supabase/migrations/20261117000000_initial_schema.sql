-- Dhara Elegance: initial schema, RLS, order/inventory functions.
-- Safe to run once on a fresh project. Uses IF NOT EXISTS where Postgres allows it.

create extension if not exists pgcrypto;

-- ============================================================
-- Types
-- ============================================================
do $$ begin
  create type public.gender_type as enum ('men', 'women');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum
    ('new', 'pending_confirmation', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- Profiles & admins
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Run manually in the SQL editor to create the first admin. Not callable from the API.
create or replace function public.promote_to_admin(p_email text, p_role text default 'super_admin')
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then raise exception 'No auth user with email %', p_email; end if;
  insert into public.admin_users (user_id, role) values (v_id, p_role)
  on conflict (user_id) do update set role = excluded.role;
end $$;
revoke execute on function public.promote_to_admin(text, text) from public, anon, authenticated;

-- ============================================================
-- Catalogue
-- ============================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  gender public.gender_type not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gender, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  gender public.gender_type not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory text,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  sku text unique,
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 5 check (low_stock_threshold >= 0),
  material text,
  metal text,
  finish text,
  color text,
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  is_archived boolean not null default false,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_bestseller boolean not null default false,
  sold_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_listing_idx on public.products (gender, category_id) where is_active and not is_archived;
create index if not exists products_created_idx on public.products (created_at desc);
create index if not exists products_tags_idx on public.products using gin (tags);
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();

-- A variant is a size/option. When a product has active variants, products.stock is kept as their sum.
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text unique,
  price numeric(10,2) check (price is null or price >= 0),
  stock int not null default 0 check (stock >= 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

create or replace function public.sync_product_stock() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_pid uuid := coalesce(new.product_id, old.product_id);
begin
  if exists (select 1 from public.product_variants where product_id = v_pid and is_active) then
    update public.products set stock = (
      select coalesce(sum(stock), 0) from public.product_variants where product_id = v_pid and is_active
    ) where id = v_pid;
  end if;
  return null;
end $$;
drop trigger if exists variants_sync_stock on public.product_variants;
create trigger variants_sync_stock after insert or update or delete on public.product_variants
  for each row execute function public.sync_product_stock();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

-- ============================================================
-- Customer data
-- ============================================================
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  line1 text not null,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0 and quantity <= 20),
  created_at timestamptz not null default now()
);
create unique index if not exists cart_items_unique on public.cart_items
  (user_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ============================================================
-- Settings & coupons
-- ============================================================
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  business_whatsapp text,             -- digits only incl. country code, e.g. 919876543210
  whatsapp_country_code text not null default '91',
  support_whatsapp text,
  shipping_fee numeric(10,2) not null default 0 check (shipping_fee >= 0),
  free_shipping_min numeric(10,2) check (free_shipping_min is null or free_shipping_min >= 0),
  announcement text default 'Anti-tarnish • Waterproof • Sweat-proof — Shine Every Day',
  instagram_handle text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict do nothing;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  value numeric(10,2) not null check (value > 0),
  min_amount numeric(10,2) not null default 0 check (min_amount >= 0),
  max_discount numeric(10,2) check (max_discount is null or max_discount >= 0),
  expires_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100)
);

-- ============================================================
-- Orders
-- ============================================================
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  phone text not null,
  email text,
  shipping_address jsonb not null,
  notes text,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0),
  coupon_code text,
  status public.order_status not null default 'pending_confirmation',
  whatsapp_number text,               -- business number in effect when the order was placed
  whatsapp_link_generated boolean not null default false,
  whatsapp_link_generated_at timestamptz,
  stock_restored boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_phone_idx on public.orders (phone, created_at desc);
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  sku text,
  image_url text,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity int not null check (quantity > 0),
  line_total numeric(10,2) not null check (line_total >= 0)
);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  note text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table if not exists public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  note text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  change int not null,
  reason text not null check (reason in ('order', 'cancellation', 'adjustment', 'initial')),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_tx_product_idx on public.inventory_transactions (product_id, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);

-- ============================================================
-- Reviews, returns, newsletter
-- ============================================================
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

-- Verified purchase is decided by the database, never by the client.
create or replace function public.set_review_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'pending';
  end if;
  new.is_verified := exists (
    select 1 from public.orders o join public.order_items i on i.order_id = o.id
    where o.user_id = new.user_id and i.product_id = new.product_id and o.status = 'delivered'
  );
  return new;
end $$;
drop trigger if exists reviews_verify on public.reviews;
create trigger reviews_verify before insert on public.reviews for each row execute function public.set_review_verified();

create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('return', 'exchange')),
  reason text not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'completed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists return_requests_updated_at on public.return_requests;
create trigger return_requests_updated_at before update on public.return_requests for each row execute function public.set_updated_at();

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Order placement (server recalculates everything, reserves stock atomically)
-- p_items: [{ "product_id": uuid, "variant_id": uuid|null, "quantity": int }]
-- p_customer: { full_name, phone, email, line1, landmark, city, state, pincode, country, notes }
-- ============================================================
create or replace function public.place_order(p_items jsonb, p_customer jsonb, p_coupon text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_settings public.site_settings;
  v_order_id uuid := gen_random_uuid();
  v_number text;
  v_item jsonb;
  v_product public.products;
  v_variant public.product_variants;
  v_qty int;
  v_price numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_discount numeric(10,2) := 0;
  v_shipping numeric(10,2) := 0;
  v_coupon public.coupons;
  v_phone text := regexp_replace(coalesce(p_customer->>'phone', ''), '\D', '', 'g');
  v_image text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Your cart is empty or too large.';
  end if;
  if length(trim(coalesce(p_customer->>'full_name', ''))) < 2 then raise exception 'Please enter your full name.'; end if;
  if length(v_phone) < 10 or length(v_phone) > 15 then raise exception 'Please enter a valid phone number.'; end if;
  if length(trim(coalesce(p_customer->>'line1', ''))) < 5 then raise exception 'Please enter your address.'; end if;
  if coalesce(p_customer->>'city', '') = '' or coalesce(p_customer->>'state', '') = '' then raise exception 'Please enter city and state.'; end if;
  if coalesce(p_customer->>'pincode', '') !~ '^[0-9A-Za-z -]{4,10}$' then raise exception 'Please enter a valid PIN code.'; end if;

  -- Rate limit: at most 5 orders per phone number in 10 minutes.
  if (select count(*) from public.orders where phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many orders in a short time. Please wait a few minutes or contact us on WhatsApp.';
  end if;

  select * into v_settings from public.site_settings where id = 1;
  v_number := 'DE' || to_char(now(), 'YYMMDD') || '-' || nextval('public.order_number_seq');

  insert into public.orders (id, order_number, user_id, customer_name, phone, email, shipping_address, notes,
                             subtotal, discount, shipping, total, status, whatsapp_number,
                             whatsapp_link_generated, whatsapp_link_generated_at)
  values (v_order_id, v_number, auth.uid(), trim(p_customer->>'full_name'), v_phone,
          nullif(trim(coalesce(p_customer->>'email', '')), ''),
          jsonb_build_object(
            'line1', trim(p_customer->>'line1'),
            'landmark', nullif(trim(coalesce(p_customer->>'landmark', '')), ''),
            'city', trim(p_customer->>'city'),
            'state', trim(p_customer->>'state'),
            'pincode', trim(p_customer->>'pincode'),
            'country', coalesce(nullif(trim(coalesce(p_customer->>'country', '')), ''), 'India')),
          nullif(left(trim(coalesce(p_customer->>'notes', '')), 1000), ''),
          0, 0, 0, 0, 'pending_confirmation', v_settings.business_whatsapp,
          v_settings.business_whatsapp is not null, case when v_settings.business_whatsapp is not null then now() end);

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 20 then raise exception 'Invalid quantity.'; end if;

    select * into v_product from public.products
      where id = (v_item->>'product_id')::uuid and is_active and not is_archived for update;
    if not found then raise exception 'A product in your cart is no longer available.'; end if;

    v_variant := null;
    if nullif(v_item->>'variant_id', '') is not null then
      select * into v_variant from public.product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_product.id and is_active for update;
      if not found then raise exception 'The selected size for % is no longer available.', v_product.name; end if;
      if v_variant.stock < v_qty then raise exception 'Only % left of % (%).', v_variant.stock, v_product.name, v_variant.name; end if;
      update public.product_variants set stock = stock - v_qty where id = v_variant.id;
      v_price := coalesce(v_variant.price, v_product.price);
    else
      if exists (select 1 from public.product_variants where product_id = v_product.id and is_active) then
        raise exception 'Please choose a size for %.', v_product.name;
      end if;
      if v_product.stock < v_qty then raise exception 'Only % left of %.', v_product.stock, v_product.name; end if;
      update public.products set stock = stock - v_qty where id = v_product.id;
      v_price := v_product.price;
    end if;

    update public.products set sold_count = sold_count + v_qty where id = v_product.id;

    select url into v_image from public.product_images where product_id = v_product.id
      order by is_primary desc, sort_order limit 1;

    insert into public.order_items (order_id, product_id, variant_id, product_name, variant_name, sku, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_product.id, v_variant.id, v_product.name, v_variant.name, coalesce(v_variant.sku, v_product.sku),
            v_image, v_price, v_qty, v_price * v_qty);

    insert into public.inventory_transactions (product_id, variant_id, change, reason, order_id, created_by)
    values (v_product.id, v_variant.id, -v_qty, 'order', v_order_id, auth.uid());

    v_subtotal := v_subtotal + v_price * v_qty;
  end loop;

  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    select * into v_coupon from public.coupons where upper(code) = upper(trim(p_coupon)) for update;
    if not found or not v_coupon.is_active or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
       or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
      raise exception 'This coupon is not valid.';
    end if;
    if v_subtotal < v_coupon.min_amount then raise exception 'This coupon needs a minimum order of ₹%.', v_coupon.min_amount; end if;
    v_discount := case when v_coupon.discount_type = 'fixed' then v_coupon.value
                       else round(v_subtotal * v_coupon.value / 100, 2) end;
    if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
    v_discount := least(v_discount, v_subtotal);
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_shipping := case when v_settings.free_shipping_min is not null and v_subtotal - v_discount >= v_settings.free_shipping_min
                     then 0 else v_settings.shipping_fee end;

  update public.orders set subtotal = v_subtotal, discount = v_discount, shipping = v_shipping,
         total = greatest(v_subtotal - v_discount + v_shipping, 0), coupon_code = v_coupon.code
   where id = v_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (v_order_id, null, 'pending_confirmation', 'Order placed on website', auth.uid());

  if auth.uid() is not null then
    delete from public.cart_items where user_id = auth.uid();
  end if;

  -- Guests cannot read orders through RLS, so return the saved snapshot for the WhatsApp message.
  return (
    select jsonb_build_object(
      'order_id', o.id, 'order_number', o.order_number, 'customer_name', o.customer_name, 'phone', o.phone,
      'subtotal', o.subtotal, 'discount', o.discount, 'shipping', o.shipping, 'total', o.total,
      'whatsapp_number', o.whatsapp_number, 'shipping_address', o.shipping_address,
      'items', (select jsonb_agg(jsonb_build_object('product_name', i.product_name, 'variant_name', i.variant_name,
                 'quantity', i.quantity, 'unit_price', i.unit_price, 'line_total', i.line_total)) from public.order_items i where i.order_id = o.id))
    from public.orders o where o.id = v_order_id);
end $$;
revoke execute on function public.place_order(jsonb, jsonb, text) from public;
grant execute on function public.place_order(jsonb, jsonb, text) to anon, authenticated;

-- Coupon preview for the checkout page (does not consume the coupon).
create or replace function public.preview_coupon(p_code text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_coupon public.coupons; v_discount numeric(10,2);
begin
  select * into v_coupon from public.coupons where upper(code) = upper(trim(p_code));
  if not found or not v_coupon.is_active or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
     or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
    return jsonb_build_object('valid', false, 'message', 'This coupon is not valid.');
  end if;
  if p_subtotal < v_coupon.min_amount then
    return jsonb_build_object('valid', false, 'message', 'Minimum order of ₹' || v_coupon.min_amount || ' required.');
  end if;
  v_discount := case when v_coupon.discount_type = 'fixed' then v_coupon.value else round(p_subtotal * v_coupon.value / 100, 2) end;
  if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
  return jsonb_build_object('valid', true, 'code', v_coupon.code, 'discount', least(v_discount, p_subtotal));
end $$;
grant execute on function public.preview_coupon(text, numeric) to anon, authenticated;

-- ============================================================
-- Admin: order status transitions (idempotent cancellation with single stock restore)
-- ============================================================
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order public.orders; v_item public.order_items; v_allowed public.order_status[];
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status = p_status then return; end if;  -- idempotent

  v_allowed := case v_order.status
    when 'new' then array['pending_confirmation','confirmed','cancelled']::public.order_status[]
    when 'pending_confirmation' then array['confirmed','cancelled']::public.order_status[]
    when 'confirmed' then array['processing','shipped','cancelled']::public.order_status[]
    when 'processing' then array['shipped','cancelled']::public.order_status[]
    when 'shipped' then array['delivered']::public.order_status[]
    else array[]::public.order_status[] end;
  if not (p_status = any(v_allowed)) then
    raise exception 'Cannot move order from % to %', v_order.status, p_status;
  end if;

  if p_status = 'cancelled' and not v_order.stock_restored then
    for v_item in select * from public.order_items where order_id = p_order_id loop
      if v_item.variant_id is not null then
        update public.product_variants set stock = stock + v_item.quantity where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update public.products set stock = stock + v_item.quantity where id = v_item.product_id;
      end if;
      if v_item.product_id is not null then
        update public.products set sold_count = greatest(sold_count - v_item.quantity, 0) where id = v_item.product_id;
        insert into public.inventory_transactions (product_id, variant_id, change, reason, order_id, created_by)
        values (v_item.product_id, v_item.variant_id, v_item.quantity, 'cancellation', p_order_id, auth.uid());
      end if;
    end loop;
    update public.orders set stock_restored = true where id = p_order_id;
  end if;

  update public.orders set status = p_status where id = p_order_id;
  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by)
  values (p_order_id, v_order.status, p_status, nullif(trim(coalesce(p_note, '')), ''), auth.uid());
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'order.status', 'order', p_order_id::text,
          jsonb_build_object('from', v_order.status, 'to', p_status, 'order_number', v_order.order_number));
end $$;
revoke execute on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;

-- Admin: manual stock adjustment with history.
create or replace function public.admin_adjust_stock(p_product_id uuid, p_variant_id uuid, p_change int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_change = 0 then return; end if;
  if p_variant_id is not null then
    update public.product_variants set stock = stock + p_change where id = p_variant_id and product_id = p_product_id;
  else
    if exists (select 1 from public.product_variants where product_id = p_product_id and is_active) then
      raise exception 'This product has sizes. Adjust stock per size.';
    end if;
    update public.products set stock = stock + p_change where id = p_product_id;
  end if;
  if not found then raise exception 'Product not found'; end if;
  insert into public.inventory_transactions (product_id, variant_id, change, reason, note, created_by)
  values (p_product_id, p_variant_id, p_change, 'adjustment', nullif(trim(coalesce(p_note, '')), ''), auth.uid());
  insert into public.audit_logs (actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'inventory.adjust', 'product', p_product_id::text,
          jsonb_build_object('variant_id', p_variant_id, 'change', p_change, 'note', p_note));
end $$;
revoke execute on function public.admin_adjust_stock(uuid, uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, uuid, int, text) to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.addresses enable row level security;
alter table public.cart_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.site_settings enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.order_notes enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.return_requests enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- profiles
drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- admin_users: read-only via API (a user may see their own row); writes only via SQL editor.
drop policy if exists "admin_users read" on public.admin_users;
create policy "admin_users read" on public.admin_users for select using (user_id = auth.uid() or public.is_admin());

-- catalogue: public reads active rows, admins do everything
drop policy if exists "categories public read" on public.categories;
create policy "categories public read" on public.categories for select using (is_active or public.is_admin());
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using ((is_active and not is_archived) or public.is_admin());
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "variants public read" on public.product_variants;
create policy "variants public read" on public.product_variants for select using (
  public.is_admin() or (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active and not p.is_archived)));
drop policy if exists "variants admin write" on public.product_variants;
create policy "variants admin write" on public.product_variants for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "images public read" on public.product_images;
create policy "images public read" on public.product_images for select using (
  public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_active and not p.is_archived));
drop policy if exists "images admin write" on public.product_images;
create policy "images admin write" on public.product_images for all using (public.is_admin()) with check (public.is_admin());

-- own-data tables
drop policy if exists "addresses own" on public.addresses;
create policy "addresses own" on public.addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cart own" on public.cart_items;
create policy "cart own" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "wishlist own" on public.wishlist_items;
create policy "wishlist own" on public.wishlist_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- settings: public read, admin update
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);
drop policy if exists "settings admin update" on public.site_settings;
create policy "settings admin update" on public.site_settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "coupons admin" on public.coupons;
create policy "coupons admin" on public.coupons for all using (public.is_admin()) with check (public.is_admin());

-- orders: customers read their own; inserts only via place_order(); updates only via admin functions/admin
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "order_items read" on public.order_items;
create policy "order_items read" on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "order_history read" on public.order_status_history;
create policy "order_history read" on public.order_status_history for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "order_notes admin" on public.order_notes;
create policy "order_notes admin" on public.order_notes for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "inventory admin read" on public.inventory_transactions;
create policy "inventory admin read" on public.inventory_transactions for select using (public.is_admin());
drop policy if exists "inventory admin insert" on public.inventory_transactions;
create policy "inventory admin insert" on public.inventory_transactions for insert with check (public.is_admin());
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs for select using (public.is_admin());
drop policy if exists "audit admin insert" on public.audit_logs;
create policy "audit admin insert" on public.audit_logs for insert with check (public.is_admin() and actor_id = auth.uid());

-- reviews
drop policy if exists "reviews read" on public.reviews;
create policy "reviews read" on public.reviews for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "reviews admin" on public.reviews;
create policy "reviews admin" on public.reviews for all using (public.is_admin()) with check (public.is_admin());

-- returns
drop policy if exists "returns read" on public.return_requests;
create policy "returns read" on public.return_requests for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "returns insert own" on public.return_requests;
create policy "returns insert own" on public.return_requests for insert with check (
  user_id = auth.uid() and status = 'requested' and admin_note is null
  and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'delivered'));
drop policy if exists "returns admin" on public.return_requests;
create policy "returns admin" on public.return_requests for update using (public.is_admin()) with check (public.is_admin());

-- newsletter: anyone may subscribe, only admins read
drop policy if exists "newsletter insert" on public.newsletter_subscribers;
create policy "newsletter insert" on public.newsletter_subscribers for insert with check (true);
drop policy if exists "newsletter admin read" on public.newsletter_subscribers;
create policy "newsletter admin read" on public.newsletter_subscribers for select using (public.is_admin());

-- ============================================================
-- Storage: public product-images bucket, admin-only writes
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());

-- ============================================================
-- Seed: categories (Men and Women lists are kept separate by gender)
-- ============================================================
insert into public.categories (name, slug, gender, sort_order) values
  ('Rings', 'rings', 'men', 1), ('Chains', 'chains', 'men', 2), ('Kadas', 'kadas', 'men', 3), ('Earrings', 'earrings', 'men', 4),
  ('Chains', 'chains', 'women', 1), ('Pendants', 'pendants', 'women', 2), ('Rings', 'rings', 'women', 3),
  ('Earrings', 'earrings', 'women', 4), ('Kadas', 'kadas', 'women', 5), ('Bracelets', 'bracelets', 'women', 6)
on conflict (gender, slug) do nothing;
