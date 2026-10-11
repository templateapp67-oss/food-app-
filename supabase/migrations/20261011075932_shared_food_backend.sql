-- Shared Supabase deployment: Food-only additive namespace. Legacy standalone migrations above must NOT be applied to the shared project.
-- 001: extensions, enums, shared helpers
-- Source of truth: docs/05_SCHEMA.md §1. Append-only: never edit after applied.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists citext   with schema extensions;
create extension if not exists postgis  with schema extensions;

create type public.nexora_food_app_role as enum
  ('customer','restaurant_owner','restaurant_staff','rider','support','admin','super_admin');

create type public.nexora_food_order_status as enum
  ('pending_payment','placed','confirmed','preparing','ready_for_pickup',
   'out_for_delivery','delivered','rejected','cancelled');

create type public.nexora_food_payment_status as enum
  ('none','cod_pending','pending','paid','failed','cod_collected',
   'refund_pending','partially_refunded','refunded');

create type public.nexora_food_refund_status as enum ('requested','processing','succeeded','failed');
create type public.nexora_food_payment_method as enum ('cod','online');
create type public.nexora_food_ledger_type as enum ('earn','redeem','expire','reversal','adjustment');

create or replace function public.nexora_food_set_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 002: profiles, roles, addresses, restaurants, members, hours, zones
-- RLS is ENABLED here with no policies = deny-all for anon/authenticated until
-- migration 007 adds policies. This is deliberate (safe by default).

set search_path = public, extensions;

create table public.nexora_food_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  email text,
  avatar_url text,
  preferred_lang text not null default 'en' check (preferred_lang in ('en','hi')),
  marketing_opt_in boolean not null default false,
  is_blocked boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index nexora_food_profiles_phone_key on public.nexora_food_profiles(phone) where phone is not null;
create trigger profiles_updated before update on public.nexora_food_profiles
  for each row execute function public.nexora_food_set_updated_at();
alter table public.nexora_food_profiles enable row level security;

create table public.nexora_food_user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.nexora_food_app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.nexora_food_user_roles enable row level security;

create table public.nexora_food_user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nexora_food_profiles(id) on delete cascade,
  type text not null default 'home' check (type in ('home','work','other')),
  line1 text not null check (length(line1) between 1 and 200),
  line2 text,
  landmark text,
  locality text not null,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  location geography(Point,4326),
  instructions text check (instructions is null or length(instructions) <= 300),
  is_default boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nexora_food_user_addresses_user_idx on public.nexora_food_user_addresses(user_id) where deleted_at is null;
create unique index nexora_food_user_addresses_one_default on public.nexora_food_user_addresses(user_id)
  where is_default and deleted_at is null;
create trigger user_addresses_updated before update on public.nexora_food_user_addresses
  for each row execute function public.nexora_food_set_updated_at();
alter table public.nexora_food_user_addresses enable row level security;

create table public.nexora_food_restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  address text not null,
  city text not null,
  location geography(Point,4326) not null,
  phone text,
  fssai_no text,
  gstin text,
  status text not null default 'pending'
    check (status in ('pending','active','suspended','inactive')),
  is_temporarily_closed boolean not null default false,
  prep_time_min integer not null default 20 check (prep_time_min between 1 and 240),
  avg_cost_for_two_paise bigint check (avg_cost_for_two_paise is null or avg_cost_for_two_paise >= 0),
  min_order_paise bigint not null default 0 check (min_order_paise >= 0),
  delivery_fee_override_paise bigint check (delivery_fee_override_paise is null or delivery_fee_override_paise >= 0),
  commission_bps integer not null default 0 check (commission_bps between 0 and 10000),
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  is_veg_only boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nexora_food_restaurants_location_gix on public.nexora_food_restaurants using gist (location);
create index nexora_food_restaurants_name_trgm on public.nexora_food_restaurants using gin (name extensions.gin_trgm_ops);
create index nexora_food_restaurants_status_idx on public.nexora_food_restaurants(status);
create trigger restaurants_updated before update on public.nexora_food_restaurants
  for each row execute function public.nexora_food_set_updated_at();
alter table public.nexora_food_restaurants enable row level security;

create table public.nexora_food_restaurant_members (
  restaurant_id uuid not null references public.nexora_food_restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index nexora_food_restaurant_members_user_idx on public.nexora_food_restaurant_members(user_id);
alter table public.nexora_food_restaurant_members enable row level security;

-- Multiple rows per weekday allowed (split shifts). closes < opens means it runs past midnight.
create table public.nexora_food_restaurant_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.nexora_food_restaurants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time,
  closes time,
  is_closed boolean not null default false,
  check (is_closed or (opens is not null and closes is not null))
);
create index nexora_food_restaurant_hours_rest_idx on public.nexora_food_restaurant_hours(restaurant_id, weekday);
alter table public.nexora_food_restaurant_hours enable row level security;

-- restaurant_id NULL = platform-wide zone
create table public.nexora_food_restaurant_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.nexora_food_restaurants(id) on delete cascade,
  name text not null,
  center geography(Point,4326),
  radius_m integer check (radius_m is null or radius_m > 0),
  polygon geography(Polygon,4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (polygon is not null or (center is not null and radius_m is not null))
);
create index nexora_food_delivery_zones_rest_idx on public.nexora_food_restaurant_delivery_zones(restaurant_id);
create index nexora_food_delivery_zones_polygon_gix on public.nexora_food_restaurant_delivery_zones using gist (polygon);
alter table public.nexora_food_restaurant_delivery_zones enable row level security;

-- 003: categories, menu, variants, add-ons, favorites
-- Variants use price_delta_paise (added to item base price). RLS enabled, deny-all until 007.

set search_path = public, extensions;

create table public.nexora_food_food_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.nexora_food_food_categories enable row level security;

create table public.nexora_food_restaurant_cuisines (
  restaurant_id uuid not null references public.nexora_food_restaurants(id) on delete cascade,
  food_category_id uuid not null references public.nexora_food_food_categories(id) on delete restrict,
  primary key (restaurant_id, food_category_id)
);
create index nexora_food_restaurant_cuisines_cat_idx on public.nexora_food_restaurant_cuisines(food_category_id);
alter table public.nexora_food_restaurant_cuisines enable row level security;

create table public.nexora_food_menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.nexora_food_restaurants(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)   -- target for composite FK: item category must be in same restaurant
);
create index nexora_food_menu_categories_rest_idx on public.nexora_food_menu_categories(restaurant_id, sort_order);
create trigger menu_categories_updated before update on public.nexora_food_menu_categories
  for each row execute function public.nexora_food_set_updated_at();
alter table public.nexora_food_menu_categories enable row level security;

create table public.nexora_food_menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.nexora_food_restaurants(id) on delete cascade,
  menu_category_id uuid,
  name text not null check (length(name) between 1 and 120),
  description text,
  image_url text,
  price_paise bigint not null check (price_paise >= 0),
  mrp_paise bigint,
  is_veg boolean not null,
  is_available boolean not null default true,
  is_bestseller boolean not null default false,
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  tax_class text not null default 'standard',
  sort_order integer not null default 0,
  is_demo boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mrp_paise is null or mrp_paise >= price_paise),
  unique (id, restaurant_id),
  foreign key (menu_category_id, restaurant_id)
    references public.nexora_food_menu_categories(id, restaurant_id) on delete set null (menu_category_id)
);
create index nexora_food_menu_items_rest_idx on public.nexora_food_menu_items(restaurant_id) where deleted_at is null;
create index nexora_food_menu_items_name_trgm on public.nexora_food_menu_items using gin (name extensions.gin_trgm_ops);
create trigger menu_items_updated before update on public.nexora_food_menu_items
  for each row execute function public.nexora_food_set_updated_at();
alter table public.nexora_food_menu_items enable row level security;

create table public.nexora_food_menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.nexora_food_menu_items(id) on delete cascade,
  name text not null,
  price_delta_paise bigint not null default 0 check (price_delta_paise >= 0),
  is_default boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index nexora_food_menu_item_variants_item_idx on public.nexora_food_menu_item_variants(item_id);
create unique index nexora_food_menu_item_variants_one_default on public.nexora_food_menu_item_variants(item_id) where is_default;
alter table public.nexora_food_menu_item_variants enable row level security;

create table public.nexora_food_menu_addon_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.nexora_food_menu_items(id) on delete cascade,
  name text not null,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  check (max_select >= min_select and max_select >= 1),
  check (not is_required or min_select >= 1)
);
create index nexora_food_menu_addon_groups_item_idx on public.nexora_food_menu_addon_groups(item_id);
alter table public.nexora_food_menu_addon_groups enable row level security;

create table public.nexora_food_menu_item_addons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.nexora_food_menu_addon_groups(id) on delete cascade,
  name text not null,
  price_paise bigint not null default 0 check (price_paise >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index nexora_food_menu_item_addons_group_idx on public.nexora_food_menu_item_addons(group_id);
alter table public.nexora_food_menu_item_addons enable row level security;

create table public.nexora_food_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.nexora_food_profiles(id) on delete cascade,
  restaurant_id uuid references public.nexora_food_restaurants(id) on delete cascade,
  menu_item_id uuid references public.nexora_food_menu_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(restaurant_id, menu_item_id) = 1)
);
create unique index nexora_food_favorites_user_restaurant_key on public.nexora_food_favorites(user_id, restaurant_id) where restaurant_id is not null;
create unique index nexora_food_favorites_user_item_key on public.nexora_food_favorites(user_id, menu_item_id) where menu_item_id is not null;
alter table public.nexora_food_favorites enable row level security;

-- Nexora Food: additive platform schema. Original 001–003 retained unchanged.
set search_path=public,extensions;
create schema if not exists nexora_food_private;
revoke all on schema nexora_food_private from public;
grant usage on schema nexora_food_private to authenticated,anon;
create function nexora_food_private.nexora_is_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_user_roles where user_id=auth.uid() and role in ('admin','super_admin'))$$;
create function nexora_food_private.nexora_is_super_admin() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_user_roles where user_id=auth.uid() and role='super_admin')$$;
create function nexora_food_private.nexora_member(r uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_restaurant_members where user_id=auth.uid() and restaurant_id=r)$$;
revoke all on function nexora_food_private.nexora_is_admin(),nexora_food_private.nexora_is_super_admin(),nexora_food_private.nexora_member(uuid) from public;
grant execute on function nexora_food_private.nexora_is_admin(),nexora_food_private.nexora_is_super_admin(),nexora_food_private.nexora_member(uuid) to authenticated,anon;
create table public.nexora_food_coupons(id uuid primary key default gen_random_uuid(),code extensions.citext unique not null,type text not null check(type in('percent','flat')),value integer not null check(value>0),max_discount_paise bigint not null check(max_discount_paise>=0),min_order_paise bigint not null default 0 check(min_order_paise>=0),starts_at timestamptz not null default now(),ends_at timestamptz not null,usage_limit_total integer not null default 1000,usage_limit_per_user integer not null default 1,restaurant_id uuid references public.nexora_food_restaurants(id),first_order_only boolean not null default false,is_active boolean not null default true,stackable boolean not null default false,created_at timestamptz default now(),check(ends_at>starts_at),check(type<>'percent' or value<=100));
create table public.nexora_food_orders(id uuid primary key default gen_random_uuid(),order_number text unique not null default ('NX-'||to_char(now(),'YYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),user_id uuid not null references auth.users(id),restaurant_id uuid not null references public.nexora_food_restaurants(id),restaurant_name_snapshot text not null,address_snapshot jsonb not null,status public.nexora_food_order_status not null,payment_method public.nexora_food_payment_method not null,payment_status public.nexora_food_payment_status not null,items_subtotal_paise bigint not null check(items_subtotal_paise>=0),discount_coupon_paise bigint not null default 0 check(discount_coupon_paise>=0),discount_loyalty_paise bigint not null default 0 check(discount_loyalty_paise>=0),delivery_fee_paise bigint not null check(delivery_fee_paise>=0),packaging_paise bigint not null default 0 check(packaging_paise>=0),platform_fee_paise bigint not null default 0 check(platform_fee_paise>=0),tax_paise bigint not null check(tax_paise>=0),tip_paise bigint not null default 0 check(tip_paise>=0),total_paise bigint not null check(total_paise>0),currency text not null default 'INR' check(currency='INR'),points_redeemed integer not null default 0,points_earned integer not null default 0,special_instructions text,idempotency_key text not null,estimated_delivery_at timestamptz,placed_at timestamptz,accepted_at timestamptz,delivered_at timestamptz,cancelled_at timestamptz,cancel_reason text,cancelled_by uuid,is_demo boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(user_id,idempotency_key),check(total_paise=items_subtotal_paise-discount_coupon_paise-discount_loyalty_paise+delivery_fee_paise+packaging_paise+platform_fee_paise+tax_paise+tip_paise),check(discount_coupon_paise+discount_loyalty_paise<=items_subtotal_paise));
create index nexora_food_orders_user_time on public.nexora_food_orders(user_id,created_at desc);create index nexora_food_orders_rest_status on public.nexora_food_orders(restaurant_id,status);
create table public.nexora_food_order_items(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.nexora_food_orders(id),menu_item_id uuid references public.nexora_food_menu_items(id),name_snapshot text not null,unit_price_paise bigint not null check(unit_price_paise>=0),quantity integer not null check(quantity between 1 and 20),variant_snapshot jsonb,line_total_paise bigint not null check(line_total_paise>=0),is_veg boolean not null,instructions text,check(line_total_paise=unit_price_paise*quantity));
create index nexora_food_order_items_parent on public.nexora_food_order_items(order_id);
create table public.nexora_food_order_item_customizations(id uuid primary key default gen_random_uuid(),order_item_id uuid not null references public.nexora_food_order_items(id),group_name text not null,option_name text not null,price_paise bigint not null check(price_paise>=0));
create table public.nexora_food_order_status_history(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.nexora_food_orders(id),from_status public.nexora_food_order_status,to_status public.nexora_food_order_status not null,actor_id uuid,actor_role text,note text,created_at timestamptz not null default now());
create table public.nexora_food_payments(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.nexora_food_orders(id),provider text not null default 'razorpay',provider_order_id text unique,provider_payment_id text unique,amount_paise bigint not null check(amount_paise>0),status public.nexora_food_payment_status not null default 'pending',signature_verified boolean not null default false,raw_event_id text,created_at timestamptz not null default now());
create table public.nexora_food_refunds(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.nexora_food_orders(id),payment_id uuid not null references public.nexora_food_payments(id),amount_paise bigint not null check(amount_paise>0),reason text not null,status public.nexora_food_refund_status not null default 'requested',provider_refund_id text unique,requested_by uuid,created_at timestamptz not null default now());
create table public.nexora_food_webhook_events(id uuid primary key default gen_random_uuid(),provider text not null,event_id text not null,payload jsonb not null,processed_at timestamptz,status text not null default 'received',unique(provider,event_id));
create table public.nexora_food_idempotency_keys(key text not null,user_id uuid not null,scope text not null,request_hash text not null,response jsonb,created_at timestamptz default now(),expires_at timestamptz not null,primary key(user_id,scope,key));
create table public.nexora_food_coupon_redemptions(id uuid primary key default gen_random_uuid(),coupon_id uuid not null references public.nexora_food_coupons(id),user_id uuid not null references auth.users(id),order_id uuid not null unique references public.nexora_food_orders(id),discount_paise bigint not null check(discount_paise>=0),released_at timestamptz);
create table public.nexora_food_restaurant_reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),restaurant_id uuid not null references public.nexora_food_restaurants(id),order_id uuid not null unique references public.nexora_food_orders(id),rating smallint not null check(rating between 1 and 5),body text check(length(body)<=2000),status text not null default 'visible' check(status in('visible','hidden','reported')),edited_until timestamptz not null default now()+interval '24 hours',created_at timestamptz not null default now());
create table public.nexora_food_food_item_reviews(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),menu_item_id uuid not null references public.nexora_food_menu_items(id),order_item_id uuid not null unique references public.nexora_food_order_items(id),rating smallint not null check(rating between 1 and 5),body text,status text not null default 'visible',created_at timestamptz default now());
create table public.nexora_food_review_reports(id uuid primary key default gen_random_uuid(),review_type text not null,review_id uuid not null,reporter_id uuid not null references auth.users(id),reason text not null,status text not null default 'open',resolved_by uuid,created_at timestamptz default now());
create table public.nexora_food_loyalty_accounts(user_id uuid primary key references auth.users(id),balance_points integer not null default 0 check(balance_points>=0),lifetime_points integer not null default 0,tier text not null default 'Bronze');
create table public.nexora_food_loyalty_ledger(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),type public.nexora_food_ledger_type not null,points integer not null check(points<>0),order_id uuid references public.nexora_food_orders(id),ref text unique,expires_at timestamptz,reason text,created_by uuid,created_at timestamptz not null default now());
create unique index nexora_food_loyalty_earn_once on public.nexora_food_loyalty_ledger(order_id) where type='earn';create unique index nexora_food_loyalty_reversal_once on public.nexora_food_loyalty_ledger(order_id) where type='reversal';
create table public.nexora_food_loyalty_tiers(name text primary key,min_lifetime_points integer not null check(min_lifetime_points>=0),benefits jsonb not null default '{}',is_active boolean not null default true);
create table public.nexora_food_device_tokens(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),token text not null unique,platform text not null,app_version text,last_seen_at timestamptz default now(),is_active boolean default true);
create table public.nexora_food_user_notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),type text not null,title text not null,body text not null,data jsonb not null default '{}',order_id uuid references public.nexora_food_orders(id),read_at timestamptz,dedupe_key text unique,created_at timestamptz default now());
create table public.nexora_food_notification_templates(key text primary key,title text not null,body text not null,is_active boolean default true);
create table public.nexora_food_support_tickets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),order_id uuid references public.nexora_food_orders(id),subject text not null check(length(subject) between 1 and 150),body text not null check(length(body) between 1 and 2000),status text not null default 'open' check(status in('open','pending','resolved','closed')),assigned_to uuid,priority text default 'normal',created_at timestamptz default now());
create table public.nexora_food_app_settings(key text primary key,value jsonb not null,updated_by uuid,updated_at timestamptz default now());
create table public.nexora_food_admin_audit_logs(id uuid primary key default gen_random_uuid(),actor_id uuid not null,action text not null,entity text not null,entity_id text,before jsonb,after jsonb,reason text not null,created_at timestamptz default now());
create table public.nexora_food_delivery_partners(user_id uuid primary key references auth.users(id),name text not null,phone text,restaurant_id uuid references public.nexora_food_restaurants(id),is_active boolean not null default true);
create table public.nexora_food_delivery_assignments(id uuid primary key default gen_random_uuid(),order_id uuid not null unique references public.nexora_food_orders(id),partner_id uuid not null references public.nexora_food_delivery_partners(user_id),assigned_by uuid not null,status text not null default 'assigned' check(status in('assigned','picked_up','delivered','failed')),assigned_at timestamptz default now(),picked_up_at timestamptz,delivered_at timestamptz);
create table public.nexora_food_restaurant_settlements(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.nexora_food_restaurants(id),period_start date not null,period_end date not null,gross_paise bigint not null,commission_paise bigint not null,tax_on_commission_paise bigint not null,refunds_paise bigint not null,net_payable_paise bigint not null,status text not null default 'draft' check(status in('draft','approved','paid')),paid_ref text,created_at timestamptz default now(),check(period_end>=period_start));
create table public.nexora_food_deletion_requests(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),requested_at timestamptz not null default now(),status text not null default 'requested' check(status in('requested','processing','completed','rejected')),notes text);
create unique index nexora_food_deletion_one_open on public.nexora_food_deletion_requests(user_id) where status in('requested','processing');
create table public.nexora_food_search_history(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),query text not null,created_at timestamptz default now());
create table nexora_food_private.cart_quotes(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),restaurant_id uuid not null,lines jsonb not null,address_id uuid not null,coupon text,points integer not null,totals jsonb not null,expires_at timestamptz not null default now()+interval '5 minutes',used_at timestamptz);
alter table public.nexora_food_user_addresses add column latitude numeric check(latitude between -90 and 90),add column longitude numeric check(longitude between -180 and 180);
-- Explicit grants are paired with deny-by-default RLS; privileged fields have no client UPDATE grant.
do $$declare t record;begin for t in select tablename from pg_tables where schemaname='public' and tablename like 'nexora_food_%' loop execute format('alter table public.%I enable row level security',t.tablename);end loop;end$$;
alter table nexora_food_private.cart_quotes enable row level security;
revoke all on public.nexora_food_profiles,public.nexora_food_user_roles,public.nexora_food_user_addresses,public.nexora_food_restaurants,public.nexora_food_restaurant_members,public.nexora_food_restaurant_hours,public.nexora_food_restaurant_delivery_zones,public.nexora_food_food_categories,public.nexora_food_restaurant_cuisines,public.nexora_food_menu_categories,public.nexora_food_menu_items,public.nexora_food_menu_item_variants,public.nexora_food_menu_addon_groups,public.nexora_food_menu_item_addons,public.nexora_food_favorites,public.nexora_food_coupons,public.nexora_food_orders,public.nexora_food_order_items,public.nexora_food_order_item_customizations,public.nexora_food_order_status_history,public.nexora_food_payments,public.nexora_food_refunds,public.nexora_food_webhook_events,public.nexora_food_idempotency_keys,public.nexora_food_coupon_redemptions,public.nexora_food_restaurant_reviews,public.nexora_food_food_item_reviews,public.nexora_food_review_reports,public.nexora_food_loyalty_accounts,public.nexora_food_loyalty_ledger,public.nexora_food_loyalty_tiers,public.nexora_food_device_tokens,public.nexora_food_user_notifications,public.nexora_food_notification_templates,public.nexora_food_support_tickets,public.nexora_food_app_settings,public.nexora_food_admin_audit_logs,public.nexora_food_delivery_partners,public.nexora_food_delivery_assignments,public.nexora_food_restaurant_settlements,public.nexora_food_deletion_requests,public.nexora_food_search_history from anon,authenticated;
grant select on public.nexora_food_profiles,public.nexora_food_user_roles,public.nexora_food_user_addresses,public.nexora_food_restaurants,public.nexora_food_restaurant_members,public.nexora_food_restaurant_hours,public.nexora_food_restaurant_delivery_zones,public.nexora_food_food_categories,public.nexora_food_restaurant_cuisines,public.nexora_food_menu_categories,public.nexora_food_menu_items,public.nexora_food_menu_item_variants,public.nexora_food_menu_addon_groups,public.nexora_food_menu_item_addons,public.nexora_food_favorites,public.nexora_food_coupons,public.nexora_food_orders,public.nexora_food_order_items,public.nexora_food_order_item_customizations,public.nexora_food_order_status_history,public.nexora_food_payments,public.nexora_food_refunds,public.nexora_food_webhook_events,public.nexora_food_idempotency_keys,public.nexora_food_coupon_redemptions,public.nexora_food_restaurant_reviews,public.nexora_food_food_item_reviews,public.nexora_food_review_reports,public.nexora_food_loyalty_accounts,public.nexora_food_loyalty_ledger,public.nexora_food_loyalty_tiers,public.nexora_food_device_tokens,public.nexora_food_user_notifications,public.nexora_food_notification_templates,public.nexora_food_support_tickets,public.nexora_food_app_settings,public.nexora_food_admin_audit_logs,public.nexora_food_delivery_partners,public.nexora_food_delivery_assignments,public.nexora_food_restaurant_settlements,public.nexora_food_deletion_requests,public.nexora_food_search_history to authenticated;
grant all on public.nexora_food_profiles,public.nexora_food_user_roles,public.nexora_food_user_addresses,public.nexora_food_restaurants,public.nexora_food_restaurant_members,public.nexora_food_restaurant_hours,public.nexora_food_restaurant_delivery_zones,public.nexora_food_food_categories,public.nexora_food_restaurant_cuisines,public.nexora_food_menu_categories,public.nexora_food_menu_items,public.nexora_food_menu_item_variants,public.nexora_food_menu_addon_groups,public.nexora_food_menu_item_addons,public.nexora_food_favorites,public.nexora_food_coupons,public.nexora_food_orders,public.nexora_food_order_items,public.nexora_food_order_item_customizations,public.nexora_food_order_status_history,public.nexora_food_payments,public.nexora_food_refunds,public.nexora_food_webhook_events,public.nexora_food_idempotency_keys,public.nexora_food_coupon_redemptions,public.nexora_food_restaurant_reviews,public.nexora_food_food_item_reviews,public.nexora_food_review_reports,public.nexora_food_loyalty_accounts,public.nexora_food_loyalty_ledger,public.nexora_food_loyalty_tiers,public.nexora_food_device_tokens,public.nexora_food_user_notifications,public.nexora_food_notification_templates,public.nexora_food_support_tickets,public.nexora_food_app_settings,public.nexora_food_admin_audit_logs,public.nexora_food_delivery_partners,public.nexora_food_delivery_assignments,public.nexora_food_restaurant_settlements,public.nexora_food_deletion_requests,public.nexora_food_search_history to service_role;
grant select on public.nexora_food_restaurants,public.nexora_food_food_categories,public.nexora_food_restaurant_cuisines,public.nexora_food_menu_categories,public.nexora_food_menu_items,public.nexora_food_menu_item_variants,public.nexora_food_menu_addon_groups,public.nexora_food_menu_item_addons,public.nexora_food_restaurant_reviews,public.nexora_food_food_item_reviews,public.nexora_food_restaurant_hours to anon;
grant insert on public.nexora_food_support_tickets,public.nexora_food_device_tokens to authenticated;
grant update(read_at) on public.nexora_food_user_notifications to authenticated;
grant delete on public.nexora_food_device_tokens to authenticated;
create policy profiles_own_read on public.nexora_food_profiles for select to authenticated using(id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy roles_own_read on public.nexora_food_user_roles for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_super_admin());
create policy members_own_read on public.nexora_food_restaurant_members for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy addresses_own_read on public.nexora_food_user_addresses for select to authenticated using(user_id=auth.uid());
create policy restaurants_public_read on public.nexora_food_restaurants for select to anon,authenticated using(status='active' or nexora_food_private.nexora_member(id) or nexora_food_private.nexora_is_admin());
create policy hours_public_read on public.nexora_food_restaurant_hours for select to anon,authenticated using(exists(select 1 from public.nexora_food_restaurants r where r.id=restaurant_id and r.status='active') or nexora_food_private.nexora_member(restaurant_id) or nexora_food_private.nexora_is_admin());
create policy categories_public_read on public.nexora_food_food_categories for select to anon,authenticated using(is_active or nexora_food_private.nexora_is_admin());
create policy cuisines_public_read on public.nexora_food_restaurant_cuisines for select to anon,authenticated using(exists(select 1 from public.nexora_food_restaurants r where r.id=restaurant_id and r.status='active') or nexora_food_private.nexora_is_admin());
create policy menucategories_public_read on public.nexora_food_menu_categories for select to anon,authenticated using((is_active and exists(select 1 from public.nexora_food_restaurants r where r.id=restaurant_id and r.status='active')) or nexora_food_private.nexora_member(restaurant_id) or nexora_food_private.nexora_is_admin());
create policy menu_public_read on public.nexora_food_menu_items for select to anon,authenticated using((deleted_at is null and exists(select 1 from public.nexora_food_restaurants r where r.id=restaurant_id and r.status='active')) or nexora_food_private.nexora_member(restaurant_id) or nexora_food_private.nexora_is_admin());
create policy variants_public_read on public.nexora_food_menu_item_variants for select to anon,authenticated using(exists(select 1 from public.nexora_food_menu_items i where i.id=item_id));
create policy addon_groups_public_read on public.nexora_food_menu_addon_groups for select to anon,authenticated using(exists(select 1 from public.nexora_food_menu_items i where i.id=item_id));
create policy addons_public_read on public.nexora_food_menu_item_addons for select to anon,authenticated using(exists(select 1 from public.nexora_food_menu_addon_groups g where g.id=group_id));
create policy favorites_own_read on public.nexora_food_favorites for select to authenticated using(user_id=auth.uid());
create policy orders_authorized_read on public.nexora_food_orders for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_member(restaurant_id) or nexora_food_private.nexora_is_admin() or exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=nexora_food_orders.id and a.partner_id=auth.uid()));
create policy assignments_read on public.nexora_food_delivery_assignments for select to authenticated using(partner_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy partners_read on public.nexora_food_delivery_partners for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy orderitems_read on public.nexora_food_order_items for select to authenticated using(exists(select 1 from public.nexora_food_orders o where o.id=order_id));
create policy customizations_read on public.nexora_food_order_item_customizations for select to authenticated using(exists(select 1 from public.nexora_food_order_items i where i.id=order_item_id));
create policy history_read on public.nexora_food_order_status_history for select to authenticated using(exists(select 1 from public.nexora_food_orders o where o.id=order_id));
create policy reviews_visible_read on public.nexora_food_restaurant_reviews for select to anon,authenticated using(status='visible' or user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy itemreviews_visible_read on public.nexora_food_food_item_reviews for select to anon,authenticated using(status='visible' or user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy coupons_read on public.nexora_food_coupons for select to authenticated using((is_active and ends_at>now()) or nexora_food_private.nexora_is_admin());
create policy loyalty_own_read on public.nexora_food_loyalty_accounts for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy ledger_own_read on public.nexora_food_loyalty_ledger for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy tiers_read on public.nexora_food_loyalty_tiers for select to authenticated using(is_active);
create policy tokens_own_read on public.nexora_food_device_tokens for select to authenticated using(user_id=auth.uid());
create policy tokens_own_insert on public.nexora_food_device_tokens for insert to authenticated with check(user_id=auth.uid());
create policy tokens_own_delete on public.nexora_food_device_tokens for delete to authenticated using(user_id=auth.uid());
create policy notifications_own_read on public.nexora_food_user_notifications for select to authenticated using(user_id=auth.uid());
create policy notifications_own_update on public.nexora_food_user_notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy support_own_read on public.nexora_food_support_tickets for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_admin());
create policy support_own_insert on public.nexora_food_support_tickets for insert to authenticated with check(user_id=auth.uid() and status='open' and assigned_to is null and (order_id is null or exists(select 1 from public.nexora_food_orders o where o.id=order_id and o.user_id=auth.uid())));
create policy settings_admin_read on public.nexora_food_app_settings for select to authenticated using(nexora_food_private.nexora_is_admin());
create policy audit_admin_read on public.nexora_food_admin_audit_logs for select to authenticated using(nexora_food_private.nexora_is_admin());
create policy settlements_authorized_read on public.nexora_food_restaurant_settlements for select to authenticated using(nexora_food_private.nexora_is_admin() or nexora_food_private.nexora_member(restaurant_id));
create policy deletion_authorized_read on public.nexora_food_deletion_requests for select to authenticated using(user_id=auth.uid() or nexora_food_private.nexora_is_super_admin());
-- Profiles/roles cannot be promoted through editable auth metadata.
create function nexora_food_private.nexora_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.nexora_food_profiles(id,phone,email,full_name)values(new.id,new.phone,new.email,left(coalesce(new.raw_user_meta_data->>'full_name',''),120))on conflict(id)do nothing;insert into public.nexora_food_user_roles(user_id,role)values(new.id,'customer')on conflict do nothing;insert into public.nexora_food_loyalty_accounts(user_id)values(new.id)on conflict do nothing;return new;end$$;
create trigger nexora_food_new_user after insert on auth.users for each row execute function nexora_food_private.nexora_new_user();
create function nexora_food_private.nexora_ledger_balance() returns trigger language plpgsql security definer set search_path=public as $$begin update public.nexora_food_loyalty_accounts set balance_points=balance_points+new.points,lifetime_points=lifetime_points+case when new.type='earn' then new.points else 0 end where user_id=new.user_id;return new;end$$;
create trigger nexora_ledger_balance after insert on public.nexora_food_loyalty_ledger for each row execute function nexora_food_private.nexora_ledger_balance();
create function public.nexora_food_save_profile(p_name text,p_email text) returns void language plpgsql security definer set search_path=public as $$begin if auth.uid() is null then raise exception 'Sign in required';end if;if length(trim(p_name)) not between 1 and 120 then raise exception 'Enter a name between 1 and 120 characters';end if;if coalesce(p_email,'')<>'' and p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Invalid email';end if;update public.nexora_food_profiles set full_name=trim(p_name),email=nullif(trim(p_email),'') where id=auth.uid();end$$;
create function public.nexora_food_save_address(p_address jsonb) returns uuid language plpgsql security definer set search_path=public,extensions as $$declare aid uuid:=gen_random_uuid();lat numeric:=(p_address->>'latitude')::numeric;lng numeric:=(p_address->>'longitude')::numeric;begin if auth.uid() is null then raise exception 'Sign in required';end if;if lat is null or lng is null or lat not between -90 and 90 or lng not between -180 and 180 then raise exception 'Invalid coordinates';end if;insert into public.nexora_food_user_addresses(id,user_id,type,line1,locality,city,state,pincode,latitude,longitude,location,is_default)values(aid,auth.uid(),p_address->>'type',trim(p_address->>'line1'),p_address->>'locality',p_address->>'city',p_address->>'state',p_address->>'pincode',lat,lng,extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography,not exists(select 1 from public.nexora_food_user_addresses where user_id=auth.uid() and deleted_at is null));return aid;end$$;
create function public.nexora_food_toggle_favorite(p_restaurant uuid) returns boolean language plpgsql security definer set search_path=public as $$begin if auth.uid() is null then raise exception 'Sign in required';end if;delete from public.nexora_food_favorites where user_id=auth.uid() and restaurant_id=p_restaurant;if found then return false;end if;insert into public.nexora_food_favorites(user_id,restaurant_id)values(auth.uid(),p_restaurant)on conflict do nothing;return true;end$$;
create function nexora_food_private.nexora_setting(k text) returns jsonb language sql stable security definer set search_path=public as $$select value from public.nexora_food_app_settings where key=k$$;
create function nexora_food_private.nexora_compute(p_restaurant uuid,p_lines jsonb,p_address uuid,p_coupon text,p_points integer) returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare r public.nexora_food_restaurants;a public.nexora_food_user_addresses;i public.nexora_food_menu_items;l jsonb;v public.nexora_food_menu_item_variants;g public.nexora_food_menu_addon_groups;ad public.nexora_food_menu_item_addons;c public.nexora_food_coupons;subtotal bigint:=0;unit bigint;qty integer;discount bigint:=0;loyalty bigint:=0;fee bigint;taxbps integer;tax bigint;balance integer;chosen integer;ts timestamp:=now() at time zone 'Asia/Kolkata';valid_hours boolean;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if exists(select 1 from public.nexora_food_profiles where id=auth.uid() and is_blocked)then raise exception 'This account cannot place orders';end if;
 if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines) not between 1 and 100 then raise exception 'Invalid cart';end if;
 if p_points is null or p_points<0 or p_points%100<>0 then raise exception 'Redeem points in multiples of 100';end if;
 select * into r from public.nexora_food_restaurants where id=p_restaurant;
 if not found or r.status<>'active' or r.is_temporarily_closed or r.is_demo then raise exception 'Restaurant is unavailable';end if;
 select * into a from public.nexora_food_user_addresses where id=p_address and user_id=auth.uid() and deleted_at is null;
 if not found or a.location is null then raise exception 'Choose a valid delivery address';end if;
 if not exists(select 1 from public.nexora_food_restaurant_delivery_zones z where z.is_active and(z.restaurant_id is null or z.restaurant_id=r.id)and((z.polygon is not null and extensions.ST_Covers(z.polygon::extensions.geometry,a.location::extensions.geometry))or(z.center is not null and extensions.ST_DWithin(z.center,a.location,z.radius_m))))then raise exception 'We do not deliver to this address yet';end if;
 select exists(select 1 from public.nexora_food_restaurant_hours h where h.restaurant_id=r.id and not h.is_closed and((h.weekday=extract(dow from ts) and h.closes>h.opens and ts::time>=h.opens and ts::time<h.closes)or(h.closes<h.opens and((h.weekday=extract(dow from ts)and ts::time>=h.opens)or(h.weekday=extract(dow from ts-interval '1 day')and ts::time<h.closes)))))into valid_hours;
 if not valid_hours then raise exception 'Restaurant is closed or business hours are not configured';end if;
 for l in select value from jsonb_array_elements(p_lines) loop
 qty:=(l->>'quantity')::integer;if qty is null or qty not between 1 and 20 then raise exception 'Quantity must be between 1 and 20';end if;
 select * into i from public.nexora_food_menu_items where id=(l->>'item_id')::uuid and restaurant_id=r.id and is_available and deleted_at is null and not is_demo for share;if not found then raise exception 'A selected item is unavailable';end if;unit:=i.price_paise;
 if l->>'variant_id' is not null then select * into v from public.nexora_food_menu_item_variants where id=(l->>'variant_id')::uuid and item_id=i.id and is_available;if not found then raise exception 'Variant unavailable';end if;unit:=unit+v.price_delta_paise;
 elsif exists(select 1 from public.nexora_food_menu_item_variants where item_id=i.id and is_available)then raise exception 'Choose a dish variant';end if;
 if jsonb_array_length(coalesce(l->'addon_ids','[]'))>50 then raise exception 'Too many add-ons';end if;
 if (select count(*) from jsonb_array_elements_text(coalesce(l->'addon_ids','[]')))<>(select count(distinct value)from jsonb_array_elements_text(coalesce(l->'addon_ids','[]')))then raise exception 'Duplicate add-on';end if;
 for ad in select aa.* from public.nexora_food_menu_item_addons aa where aa.id in(select value::uuid from jsonb_array_elements_text(coalesce(l->'addon_ids','[]')))loop if not ad.is_available or not exists(select 1 from public.nexora_food_menu_addon_groups gg where gg.id=ad.group_id and gg.item_id=i.id)then raise exception 'Invalid add-on';end if;unit:=unit+ad.price_paise;end loop;
 if (select count(*)from public.nexora_food_menu_item_addons where id in(select value::uuid from jsonb_array_elements_text(coalesce(l->'addon_ids','[]'))))<>jsonb_array_length(coalesce(l->'addon_ids','[]'))then raise exception 'Unknown add-on';end if;
 for g in select * from public.nexora_food_menu_addon_groups where item_id=i.id loop select count(*)into chosen from public.nexora_food_menu_item_addons where group_id=g.id and id in(select value::uuid from jsonb_array_elements_text(coalesce(l->'addon_ids','[]')));if chosen<g.min_select or chosen>g.max_select then raise exception 'Add-on selection invalid for %',g.name;end if;end loop;
 subtotal:=subtotal+unit*qty;
 end loop;
 if subtotal<r.min_order_paise then raise exception 'Minimum order not met';end if;
 if coalesce(p_coupon,'')<>'' then select * into c from public.nexora_food_coupons where code=p_coupon::extensions.citext for update;if not found or not c.is_active or now()<c.starts_at or now()>=c.ends_at or subtotal<c.min_order_paise or(c.restaurant_id is not null and c.restaurant_id<>r.id)then raise exception 'Coupon is not eligible';end if;
 if (select count(*)from public.nexora_food_coupon_redemptions where coupon_id=c.id and released_at is null)>=c.usage_limit_total or(select count(*)from public.nexora_food_coupon_redemptions where coupon_id=c.id and user_id=auth.uid() and released_at is null)>=c.usage_limit_per_user then raise exception 'Coupon usage limit reached';end if;
 if c.first_order_only and exists(select 1 from public.nexora_food_orders where user_id=auth.uid() and status not in('cancelled','rejected'))then raise exception 'Coupon is for first orders only';end if;
 discount:=least(subtotal,c.max_discount_paise,case when c.type='percent' then floor(subtotal::numeric*c.value/100)::bigint else c.value end);end if;
 select balance_points into balance from public.nexora_food_loyalty_accounts where user_id=auth.uid() for update;
 if p_points>coalesce(balance,0)then raise exception 'Insufficient reward points';end if;
 loyalty:=p_points::bigint*10;if loyalty>floor(subtotal::numeric*.2) or loyalty>subtotal-discount then raise exception 'Reward redemption exceeds order limit';end if;
 fee:=coalesce(r.delivery_fee_override_paise,(nexora_food_private.nexora_setting('delivery.flat_paise')#>>'{}')::bigint);taxbps:=(nexora_food_private.nexora_setting('tax.bps')#>>'{}')::integer;
 if fee is null or taxbps is null then raise exception 'Delivery fees and reviewed tax settings must be configured';end if;
 tax:=floor(((subtotal-discount-loyalty)::numeric*taxbps+5000)/10000)::bigint;
 return jsonb_build_object('items_subtotal_paise',subtotal,'discount_coupon_paise',discount,'discount_loyalty_paise',loyalty,'delivery_fee_paise',fee,'packaging_paise',0,'platform_fee_paise',0,'tax_paise',tax,'total_paise',subtotal-discount-loyalty+fee+tax,'points_redeemed',p_points);
end$$;
create function public.nexora_food_quote_cart(p_restaurant uuid,p_lines jsonb,p_address uuid,p_coupon text default null,p_points integer default 0)returns jsonb language plpgsql security definer set search_path=public as $$declare totals jsonb;q uuid;expiry timestamptz;begin totals:=nexora_food_private.nexora_compute(p_restaurant,p_lines,p_address,p_coupon,p_points);insert into nexora_food_private.cart_quotes(user_id,restaurant_id,lines,address_id,coupon,points,totals)values(auth.uid(),p_restaurant,p_lines,p_address,p_coupon,p_points,totals)returning id,expires_at into q,expiry;return totals||jsonb_build_object('quote_id',q,'expires_at',expiry);end$$;
create function public.nexora_food_place_order(p_restaurant uuid,p_lines jsonb,p_address uuid,p_coupon text,p_points integer,p_key text,p_method text,p_quote uuid)returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare q nexora_food_private.cart_quotes;totals jsonb;o public.nexora_food_orders;line jsonb;i public.nexora_food_menu_items;unit bigint;v jsonb;oi uuid;hash text;a public.nexora_food_user_addresses;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;if length(p_key)not between 8 and 100 then raise exception 'Invalid checkout key';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_key,0));
 hash:=encode(extensions.digest(jsonb_build_object('restaurant',p_restaurant,'lines',p_lines,'address',p_address,'coupon',p_coupon,'points',p_points,'method',p_method)::text,'sha256'),'hex');
 select * into o from public.nexora_food_orders where user_id=auth.uid()and idempotency_key=p_key;
 if found then if not exists(select 1 from public.nexora_food_idempotency_keys where user_id=auth.uid()and key=p_key and scope='checkout' and request_hash=hash)then raise exception 'Checkout key reused with different contents';end if;return jsonb_build_object('id',o.id,'order_number',o.order_number);end if;
 select * into q from nexora_food_private.cart_quotes where id=p_quote and user_id=auth.uid() for update;
 if not found or q.used_at is not null or q.expires_at<now() or q.restaurant_id<>p_restaurant or q.lines<>p_lines or q.address_id<>p_address or q.points<>p_points or q.coupon is distinct from p_coupon then raise exception 'Quote expired or cart changed. Review prices again';end if;
 totals:=nexora_food_private.nexora_compute(p_restaurant,p_lines,p_address,p_coupon,p_points);if totals<>q.totals then raise exception 'Prices were updated. Review your cart';end if;
 if p_method is null or p_method not in('cod','online') then raise exception 'Invalid payment method';end if;
 if p_method='cod' and (coalesce((nexora_food_private.nexora_setting('cod.enabled')#>>'{}')::boolean,false)=false or(totals->>'total_paise')::bigint>coalesce((nexora_food_private.nexora_setting('cod.max_paise')#>>'{}')::bigint,0))then raise exception 'Cash on delivery is unavailable for this order';end if;
 if p_method='online' and not coalesce((nexora_food_private.nexora_setting('payments.online_enabled')#>>'{}')::boolean,false)then raise exception 'Online payment setup pending';end if;
 select * into a from public.nexora_food_user_addresses where id=p_address and user_id=auth.uid();
 insert into public.nexora_food_orders(user_id,restaurant_id,restaurant_name_snapshot,address_snapshot,status,payment_method,payment_status,items_subtotal_paise,discount_coupon_paise,discount_loyalty_paise,delivery_fee_paise,tax_paise,total_paise,points_redeemed,idempotency_key,placed_at)values(auth.uid(),p_restaurant,(select name from public.nexora_food_restaurants where id=p_restaurant),to_jsonb(a)-'user_id'-'location',case when p_method='cod' then 'placed'::public.nexora_food_order_status else 'pending_payment'::public.nexora_food_order_status end,p_method::public.nexora_food_payment_method,case when p_method='cod' then 'cod_pending'::public.nexora_food_payment_status else 'pending'::public.nexora_food_payment_status end,(totals->>'items_subtotal_paise')::bigint,(totals->>'discount_coupon_paise')::bigint,(totals->>'discount_loyalty_paise')::bigint,(totals->>'delivery_fee_paise')::bigint,(totals->>'tax_paise')::bigint,(totals->>'total_paise')::bigint,p_points,p_key,case when p_method='cod' then now()end)returning * into o;
 for line in select value from jsonb_array_elements(p_lines)loop select * into i from public.nexora_food_menu_items where id=(line->>'item_id')::uuid;unit:=i.price_paise;v:=null;
 if line->>'variant_id' is not null then select jsonb_build_object('name',name,'price_delta_paise',price_delta_paise),i.price_paise+price_delta_paise into v,unit from public.nexora_food_menu_item_variants where id=(line->>'variant_id')::uuid;end if;
 unit:=unit+coalesce((select sum(price_paise)from public.nexora_food_menu_item_addons where id in(select value::uuid from jsonb_array_elements_text(coalesce(line->'addon_ids','[]')))),0);
 insert into public.nexora_food_order_items(order_id,menu_item_id,name_snapshot,unit_price_paise,quantity,variant_snapshot,line_total_paise,is_veg,instructions)values(o.id,i.id,i.name,unit,(line->>'quantity')::integer,v,unit*(line->>'quantity')::integer,i.is_veg,left(line->>'instructions',300))returning id into oi;
 insert into public.nexora_food_order_item_customizations(order_item_id,group_name,option_name,price_paise)select oi,g.name,ad.name,ad.price_paise from public.nexora_food_menu_item_addons ad join public.nexora_food_menu_addon_groups g on g.id=ad.group_id where ad.id in(select value::uuid from jsonb_array_elements_text(coalesce(line->'addon_ids','[]')));
 end loop;
 if p_points>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref)values(auth.uid(),'redeem',-p_points,o.id,'redeem:'||o.id);end if;
 if coalesce(p_coupon,'')<>''then insert into public.nexora_food_coupon_redemptions(coupon_id,user_id,order_id,discount_paise)select id,auth.uid(),o.id,o.discount_coupon_paise from public.nexora_food_coupons where code=p_coupon::extensions.citext;end if;
 update nexora_food_private.cart_quotes set used_at=now()where id=q.id;
 insert into public.nexora_food_order_status_history(order_id,to_status,actor_id,actor_role)values(o.id,o.status,auth.uid(),'customer');
 insert into public.nexora_food_idempotency_keys(key,user_id,scope,request_hash,response,expires_at)values(p_key,auth.uid(),'checkout',hash,jsonb_build_object('id',o.id,'order_number',o.order_number),now()+interval '30 days');
 return jsonb_build_object('id',o.id,'order_number',o.order_number);
end$$;
create function public.nexora_food_transition_order(p_order uuid,p_to text,p_reason text default null)returns void language plpgsql security definer set search_path=public as $$
declare o public.nexora_food_orders;admin boolean:=nexora_food_private.nexora_is_admin();owner boolean;customer boolean;rider boolean;allowed boolean:=false;earn integer;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;select * into o from public.nexora_food_orders where id=p_order for update;if not found then raise exception 'Order not found';end if;
 owner:=nexora_food_private.nexora_member(o.restaurant_id);customer:=o.user_id=auth.uid();rider:=exists(select 1 from public.nexora_food_delivery_assignments where order_id=o.id and partner_id=auth.uid());if not(admin or owner or customer or rider)then raise exception 'Access denied';end if;
 if o.status::text=p_to then return;end if;
 allowed:=(o.status='placed'and p_to in('confirmed','rejected')and(owner or admin)and now()<o.created_at+interval '5 minutes')or(o.status='confirmed'and p_to='preparing'and(owner or admin))or(o.status='preparing'and p_to='ready_for_pickup'and(owner or admin))or(o.status='ready_for_pickup'and p_to='out_for_delivery'and(owner or admin or rider)and exists(select 1 from public.nexora_food_delivery_assignments where order_id=o.id))or(o.status='out_for_delivery'and p_to='delivered'and(admin or rider))or(o.status in('pending_payment','placed','confirmed')and p_to='cancelled'and(customer or admin))or(o.status in('preparing','ready_for_pickup','out_for_delivery')and p_to='cancelled'and admin);
 if not allowed then raise exception 'This order status change is not allowed';end if;
 if p_to in('cancelled','rejected')and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason is required';end if;
 update public.nexora_food_orders set status=p_to::public.nexora_food_order_status,accepted_at=case when p_to='confirmed'then now()else accepted_at end,delivered_at=case when p_to='delivered'then now()else delivered_at end,cancelled_at=case when p_to in('cancelled','rejected')then now()else cancelled_at end,cancel_reason=case when p_to in('cancelled','rejected')then p_reason else cancel_reason end,cancelled_by=case when p_to in('cancelled','rejected')then auth.uid()else cancelled_by end,payment_status=case when p_to='delivered'and payment_method='cod'then 'cod_collected'::public.nexora_food_payment_status when p_to in('cancelled','rejected')and payment_status='paid'then 'refund_pending'::public.nexora_food_payment_status else payment_status end,updated_at=now()where id=o.id;
 insert into public.nexora_food_order_status_history(order_id,from_status,to_status,actor_id,actor_role,note)values(o.id,o.status,p_to::public.nexora_food_order_status,auth.uid(),case when admin then 'admin' when owner then 'restaurant' when rider then 'rider' else 'customer' end,p_reason);
 if p_to in('cancelled','rejected')then
 if o.points_redeemed>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,reason)values(o.user_id,'adjustment',o.points_redeemed,o.id,'restore:'||o.id,'Order cancelled')on conflict(ref)do nothing;end if;
 update public.nexora_food_coupon_redemptions set released_at=now()where order_id=o.id;
 if o.payment_status='paid'then insert into public.nexora_food_refunds(order_id,payment_id,amount_paise,reason,requested_by)select o.id,id,o.total_paise,p_reason,auth.uid()from public.nexora_food_payments where order_id=o.id and status='paid';end if;
 end if;
 if p_to='delivered'then earn:=floor((o.items_subtotal_paise-o.discount_coupon_paise-o.discount_loyalty_paise)::numeric/coalesce((nexora_food_private.nexora_setting('loyalty.earn_per_paise')#>>'{}')::bigint,10000));if earn>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,expires_at)values(o.user_id,'earn',earn,o.id,'earn:'||o.id,now()+interval '365 days')on conflict do nothing;update public.nexora_food_orders set points_earned=earn where id=o.id;end if;end if;
 insert into public.nexora_food_user_notifications(user_id,type,title,body,order_id,dedupe_key)values(o.user_id,'order','Order update','Your order status changed. Open Nexora Food for details.',o.id,o.id||':'||p_to)on conflict do nothing;
 if admin then insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,before,after,reason)values(auth.uid(),'order-transition','orders',o.id::text,jsonb_build_object('status',o.status),jsonb_build_object('status',p_to),coalesce(p_reason,'Order progression'));end if;
end$$;
create function public.nexora_food_loyalty_summary()returns jsonb language sql stable security definer set search_path=public as $$select to_jsonb(a) from public.nexora_food_loyalty_accounts a where user_id=auth.uid()$$;
create function public.nexora_food_request_deletion()returns uuid language plpgsql security definer set search_path=public as $$declare rid uuid;begin if auth.uid() is null then raise exception 'Sign in required';end if;insert into public.nexora_food_deletion_requests(user_id)values(auth.uid())on conflict(user_id)where status in('requested','processing')do update set notes=public.nexora_food_deletion_requests.notes returning id into rid;update public.nexora_food_profiles set deletion_requested_at=now(),marketing_opt_in=false where id=auth.uid();return rid;end$$;
create function public.nexora_food_save_menu_item(p_item jsonb)returns uuid language plpgsql security definer set search_path=public as $$declare rid uuid:=(p_item->>'restaurant_id')::uuid;iid uuid:=coalesce((p_item->>'id')::uuid,gen_random_uuid());begin if auth.uid()is null or not(nexora_food_private.nexora_member(rid)or nexora_food_private.nexora_is_admin())then raise exception 'Access denied';end if;if exists(select 1 from public.nexora_food_menu_items where id=iid and restaurant_id<>rid)then raise exception 'Cannot move another restaurant item';end if;if coalesce(p_item->>'image_url','')<>''and(p_item->>'image_url'!~ '^https?://'or length(p_item->>'image_url')>2000)then raise exception 'Invalid image URL';end if;insert into public.nexora_food_menu_items(id,restaurant_id,name,description,price_paise,is_veg,is_available,is_bestseller,image_url)values(iid,rid,trim(p_item->>'name'),p_item->>'description',(p_item->>'price_paise')::bigint,(p_item->>'is_veg')::boolean,(p_item->>'is_available')::boolean,coalesce((p_item->>'is_bestseller')::boolean,false),nullif(p_item->>'image_url',''))on conflict(id)do update set name=excluded.name,description=excluded.description,price_paise=excluded.price_paise,is_veg=excluded.is_veg,is_available=excluded.is_available,image_url=excluded.image_url;return iid;end$$;
create function public.nexora_food_save_restaurant_profile(p_restaurant uuid,p_changes jsonb)returns void language plpgsql security definer set search_path=public as $$begin if auth.uid()is null or not(nexora_food_private.nexora_member(p_restaurant)or nexora_food_private.nexora_is_admin())then raise exception 'Access denied';end if;update public.nexora_food_restaurants set description=left(p_changes->>'description',2000),prep_time_min=(p_changes->>'prep_time_min')::integer,is_temporarily_closed=(p_changes->>'is_temporarily_closed')::boolean,phone=left(p_changes->>'phone',30)where id=p_restaurant;end$$;
create function public.nexora_food_admin_restaurant_status(p_restaurant uuid,p_status text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin access required';end if;if length(trim(p_reason))<3 or p_reason is null then raise exception 'Reason required';end if;update public.nexora_food_restaurants set status=p_status where id=p_restaurant;if not found then raise exception 'Restaurant not found';end if;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'restaurant-status','restaurants',p_restaurant::text,jsonb_build_object('status',p_status),p_reason);end$$;
create function public.nexora_food_admin_create_restaurant(p_data jsonb)returns uuid language plpgsql security definer set search_path=public,extensions as $$declare rid uuid;begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin access required';end if;if p_data->>'slug' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'then raise exception 'Invalid URL slug';end if;insert into public.nexora_food_restaurants(name,slug,address,city,location)values(p_data->>'name',p_data->>'slug',p_data->>'address',p_data->>'city',extensions.ST_SetSRID(extensions.ST_MakePoint((p_data->>'longitude')::numeric,(p_data->>'latitude')::numeric),4326)::extensions.geography)returning id into rid;if nullif(p_data->>'owner_id','')is not null then insert into public.nexora_food_restaurant_members(restaurant_id,user_id,role)values(rid,(p_data->>'owner_id')::uuid,'owner');end if;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'create','restaurants',rid::text,p_data-'owner_id','New restaurant onboarding');return rid;end$$;
create function public.nexora_food_admin_coupon(p_data jsonb)returns uuid language plpgsql security definer set search_path=public as $$declare cid uuid;begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin access required';end if;insert into public.nexora_food_coupons(code,type,value,min_order_paise,max_discount_paise,ends_at)values(p_data->>'code','percent',(p_data->>'percent')::integer,(p_data->>'min_order_paise')::bigint,(p_data->>'max_discount_paise')::bigint,(p_data->>'ends_at')::timestamptz)returning id into cid;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'create','coupons',cid::text,p_data,'New promotion');return cid;end$$;
create function public.nexora_food_admin_setting(p_key text,p_value jsonb,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin access required';end if;if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason required';end if;if p_key not in('delivery.flat_paise','cod.enabled','cod.max_paise','loyalty.earn_per_paise','tax.bps','payments.online_enabled')then raise exception 'Unsupported setting';end if;if p_key in('cod.enabled','payments.online_enabled')and jsonb_typeof(p_value)<>'boolean'then raise exception 'Expected boolean';end if;if p_key not in('cod.enabled','payments.online_enabled')and(jsonb_typeof(p_value)<>'number' or(p_value#>>'{}')!~ '^[0-9]+$'or(p_value#>>'{}')::numeric>100000000)then raise exception 'Expected nonnegative integer';end if;if p_key='tax.bps'and(p_value#>>'{}')::integer>10000 then raise exception 'Invalid tax rate';end if;if p_key='loyalty.earn_per_paise'and(p_value#>>'{}')::bigint<1 then raise exception 'Earn divisor must be positive';end if;insert into public.nexora_food_app_settings(key,value,updated_by)values(p_key,p_value,auth.uid())on conflict(key)do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now();insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'update','app_settings',p_key,p_value,p_reason);end$$;
create function public.nexora_food_admin_assign_rider(p_order uuid,p_rider uuid,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;if length(coalesce(p_reason,''))<3 then raise exception 'Reason required';end if;if not exists(select 1 from public.nexora_food_delivery_partners where user_id=p_rider and is_active)then raise exception 'Rider unavailable';end if;insert into public.nexora_food_delivery_assignments(order_id,partner_id,assigned_by)values(p_order,p_rider,auth.uid())on conflict(order_id)do update set partner_id=excluded.partner_id,assigned_by=excluded.assigned_by;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'assign-rider','orders',p_order::text,jsonb_build_object('rider',p_rider),p_reason);end$$;
-- All public RPCs require authenticated JWT. Internal helpers and provider verification stay nexora_food_private.
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname like 'nexora_food_%'loop execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);end loop;end$$;
revoke all on function nexora_food_private.nexora_compute(uuid,jsonb,uuid,text,integer),nexora_food_private.nexora_setting(text),nexora_food_private.nexora_new_user(),nexora_food_private.nexora_ledger_balance() from public,anon,authenticated;
-- Enable realtime for authorized order rows only.
do $$begin if exists(select 1 from pg_publication where pubname='supabase_realtime')and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'and schemaname='public' and tablename='nexora_food_orders')then alter publication supabase_realtime add table public.nexora_food_orders;end if;end$$;

set search_path=public,extensions;
-- Harden all new definer helpers and quote data against direct API execution.
create function public.nexora_food_submit_review(p_order uuid,p_rating integer,p_body text)returns uuid language plpgsql security definer set search_path=public as $$declare o public.nexora_food_orders;rid uuid;begin select *into o from public.nexora_food_orders where id=p_order and user_id=auth.uid();if not found or o.status<>'delivered' or o.delivered_at<now()-interval '14 days'then raise exception 'Only eligible delivered orders can be reviewed';end if;if exists(select 1 from public.nexora_food_restaurant_reviews where order_id=o.id and edited_until<now())then raise exception 'Review edit window ended';end if;insert into public.nexora_food_restaurant_reviews(user_id,restaurant_id,order_id,rating,body)values(auth.uid(),o.restaurant_id,o.id,p_rating,left(p_body,2000))on conflict(order_id)do update set rating=excluded.rating,body=excluded.body returning id into rid;update public.nexora_food_restaurants set rating_avg=(select round(avg(rating)::numeric,2)from public.nexora_food_restaurant_reviews where restaurant_id=o.restaurant_id and status='visible'),rating_count=(select count(*)from public.nexora_food_restaurant_reviews where restaurant_id=o.restaurant_id and status='visible')where id=o.restaurant_id;return rid;end$$;
create function public.nexora_food_public_config()returns jsonb language sql stable security definer set search_path=public as $$select coalesce(jsonb_object_agg(key,value),'{}')from public.nexora_food_app_settings where key in('cod.enabled','payments.online_enabled','loyalty.earn_per_paise','loyalty.redeem_paise_per_100_points')$$;
create function public.nexora_food_set_hours(p_restaurant uuid,p_hours jsonb)returns void language plpgsql security definer set search_path=public as $$declare h jsonb;begin if auth.uid()is null or not(nexora_food_private.nexora_member(p_restaurant)or nexora_food_private.nexora_is_admin())then raise exception 'Access denied';end if;if jsonb_typeof(p_hours)<>'array'or jsonb_array_length(p_hours)>21 then raise exception 'Invalid hours';end if;delete from public.nexora_food_restaurant_hours where restaurant_id=p_restaurant;for h in select value from jsonb_array_elements(p_hours)loop insert into public.nexora_food_restaurant_hours(restaurant_id,weekday,opens,closes,is_closed)values(p_restaurant,(h->>'weekday')::integer,(h->>'opens')::time,(h->>'closes')::time,(h->>'is_closed')::boolean);end loop;end$$;
create function public.nexora_food_set_zone(p_restaurant uuid,p_lat numeric,p_lng numeric,p_radius integer,p_reason text)returns uuid language plpgsql security definer set search_path=public,extensions as $$declare z uuid;begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;if p_radius is null or p_lat is null or p_lng is null or p_radius not between 100 and 100000 or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Invalid delivery zone';end if;if length(coalesce(p_reason,''))<3 then raise exception 'Reason required';end if;insert into public.nexora_food_restaurant_delivery_zones(restaurant_id,name,center,radius_m)values(p_restaurant,'Delivery area',extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng,p_lat),4326)::extensions.geography,p_radius)returning id into z;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)values(auth.uid(),'set-zone','restaurant_delivery_zones',z::text,p_reason);return z;end$$;
create function public.nexora_food_admin_role(p_user uuid,p_role text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;if length(coalesce(p_reason,''))<3 then raise exception 'Reason required';end if;insert into public.nexora_food_user_roles(user_id,role)values(p_user,p_role::public.nexora_food_app_role)on conflict do nothing;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'grant-role','user_roles',p_user::text,jsonb_build_object('role',p_role),p_reason);end$$;
create function public.nexora_food_admin_moderate_review(p_review uuid,p_status text,p_reason text)returns void language plpgsql security definer set search_path=public as $$declare rid uuid;begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;if p_status not in('visible','hidden')or length(coalesce(p_reason,''))<3 then raise exception 'Invalid moderation action';end if;update public.nexora_food_restaurant_reviews set status=p_status where id=p_review returning restaurant_id into rid;update public.nexora_food_restaurants set rating_avg=coalesce((select round(avg(rating)::numeric,2)from public.nexora_food_restaurant_reviews where restaurant_id=rid and status='visible'),0),rating_count=(select count(*)from public.nexora_food_restaurant_reviews where restaurant_id=rid and status='visible')where id=rid;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)values(auth.uid(),'moderate-review','restaurant_reviews',p_review::text,p_reason);end$$;
-- Service-only provider integration. Never grant these to authenticated or anon.
create function public.nexora_food_attach_gateway(p_order uuid,p_gateway_id text,p_amount bigint)returns void language plpgsql security definer set search_path=public as $$declare o public.nexora_food_orders;begin select *into o from public.nexora_food_orders where id=p_order for update;if not found or o.status<>'pending_payment'or o.total_paise<>p_amount then raise exception 'Order unavailable or amount mismatch';end if;insert into public.nexora_food_payments(order_id,provider,provider_order_id,amount_paise)values(o.id,'razorpay',p_gateway_id,p_amount)on conflict(provider_order_id)do nothing;end$$;
create function public.nexora_food_mark_paid(p_gateway_id text,p_payment_id text,p_amount bigint,p_event_id text,p_payload jsonb)returns void language plpgsql security definer set search_path=public as $$declare pay public.nexora_food_payments;o public.nexora_food_orders;begin insert into public.nexora_food_webhook_events(provider,event_id,payload)values('razorpay',p_event_id,p_payload)on conflict(provider,event_id)do nothing;if not found then return;end if;select *into pay from public.nexora_food_payments where provider_order_id=p_gateway_id for update;if not found or pay.amount_paise<>p_amount then raise exception 'Payment amount/order mismatch';end if;if pay.status='paid'then update public.nexora_food_webhook_events set processed_at=now(),status='processed'where provider='razorpay'and event_id=p_event_id;return;end if;select *into o from public.nexora_food_orders where id=pay.order_id for update;if o.total_paise<>p_amount then raise exception 'Order amount mismatch';end if;update public.nexora_food_payments set provider_payment_id=p_payment_id,status='paid',signature_verified=true,raw_event_id=p_event_id where id=pay.id;if o.status='pending_payment'then update public.nexora_food_orders set status='placed',payment_status='paid',placed_at=now(),updated_at=now()where id=o.id;insert into public.nexora_food_order_status_history(order_id,from_status,to_status,actor_role,note)values(o.id,'pending_payment','placed','system','Verified Razorpay payment');else if o.status in('cancelled','rejected')then update public.nexora_food_orders set payment_status='refund_pending'where id=o.id;insert into public.nexora_food_refunds(order_id,payment_id,amount_paise,reason)values(o.id,pay.id,p_amount,'Payment captured after cancellation');else raise exception 'Unexpected order status';end if;end if;update public.nexora_food_webhook_events set processed_at=now(),status='processed'where provider='razorpay'and event_id=p_event_id;end$$;
create function public.nexora_food_record_refund(p_refund uuid,p_provider_id text,p_status text)returns void language plpgsql security definer set search_path=public as $$declare r public.nexora_food_refunds;o public.nexora_food_orders;balance integer;earned integer;begin if p_status not in('processing','succeeded','failed')then raise exception 'Invalid refund state';end if;select *into r from public.nexora_food_refunds where id=p_refund for update;if not found then raise exception 'Refund not found';end if;if r.status='succeeded'then return;end if;update public.nexora_food_refunds set provider_refund_id=p_provider_id,status=p_status::public.nexora_food_refund_status where id=r.id;if p_status='succeeded'then select *into o from public.nexora_food_orders where id=r.order_id for update;update public.nexora_food_orders set payment_status=case when r.amount_paise>=total_paise then 'refunded'::public.nexora_food_payment_status else 'partially_refunded'::public.nexora_food_payment_status end where id=o.id;if r.amount_paise>=o.total_paise then select balance_points into balance from public.nexora_food_loyalty_accounts where user_id=o.user_id for update;earned:=least(balance,o.points_earned);if earned>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,reason)values(o.user_id,'reversal',-earned,o.id,'reverse:'||o.id,'Full refund')on conflict do nothing;end if;end if;end if;end$$;
create function public.nexora_food_expire_orders()returns integer language plpgsql security definer set search_path=public as $$declare o public.nexora_food_orders;n integer:=0;begin for o in select *from public.nexora_food_orders where(status='pending_payment'and created_at<now()-interval '15 minutes')or(status='placed'and coalesce(placed_at,created_at)<now()-interval '5 minutes')for update skip locked loop update public.nexora_food_orders set status=case when o.status='placed'then 'rejected'::public.nexora_food_order_status else 'cancelled'::public.nexora_food_order_status end,cancelled_at=now(),cancel_reason='Order timed out',payment_status=case when payment_status='paid'then 'refund_pending'::public.nexora_food_payment_status else payment_status end where id=o.id;insert into public.nexora_food_order_status_history(order_id,from_status,to_status,actor_role,note)values(o.id,o.status,case when o.status='placed'then 'rejected'::public.nexora_food_order_status else 'cancelled'::public.nexora_food_order_status end,'system','Timeout');if o.points_redeemed>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,reason)values(o.user_id,'adjustment',o.points_redeemed,o.id,'restore:'||o.id,'Timeout')on conflict do nothing;end if;if o.payment_status='paid'then insert into public.nexora_food_refunds(order_id,payment_id,amount_paise,reason)select o.id,id,o.total_paise,'Order timed out'from public.nexora_food_payments where order_id=o.id and status='paid';end if;update public.nexora_food_coupon_redemptions set released_at=now()where order_id=o.id;n:=n+1;end loop;delete from nexora_food_private.cart_quotes where expires_at<now()-interval '1 day';return n;end$$;
revoke all on function public.nexora_food_attach_gateway(uuid,text,bigint),public.nexora_food_mark_paid(text,text,bigint,text,jsonb),public.nexora_food_record_refund(uuid,text,text),public.nexora_food_expire_orders()from public,anon,authenticated;
grant execute on function public.nexora_food_attach_gateway(uuid,text,bigint),public.nexora_food_mark_paid(text,text,bigint,text,jsonb),public.nexora_food_record_refund(uuid,text,text),public.nexora_food_expire_orders()to service_role;
revoke all on function public.nexora_food_submit_review(uuid,integer,text),public.nexora_food_set_hours(uuid,jsonb),public.nexora_food_set_zone(uuid,numeric,numeric,integer,text),public.nexora_food_admin_role(uuid,text,text),public.nexora_food_admin_moderate_review(uuid,text,text)from public,anon;
grant execute on function public.nexora_food_submit_review(uuid,integer,text),public.nexora_food_set_hours(uuid,jsonb),public.nexora_food_set_zone(uuid,numeric,numeric,integer,text),public.nexora_food_admin_role(uuid,text,text),public.nexora_food_admin_moderate_review(uuid,text,text)to authenticated;
revoke all on function public.nexora_food_public_config()from public;grant execute on function public.nexora_food_public_config()to anon,authenticated;
-- Upload policies: public food imagery; avatars are owner-nexora_food_private. No client bucket creation.

create policy nexora_food_images_read on storage.objects for select to anon,authenticated using(bucket_id in('nexora-food-restaurants','nexora-food-menu'));
create policy nexora_food_images_insert on storage.objects for insert to authenticated with check(bucket_id in('nexora-food-restaurants','nexora-food-menu')and(nexora_food_private.nexora_member((storage.foldername(name))[1]::uuid)or nexora_food_private.nexora_is_admin()));
create policy nexora_food_images_update on storage.objects for update to authenticated using(bucket_id in('nexora-food-restaurants','nexora-food-menu')and(nexora_food_private.nexora_member((storage.foldername(name))[1]::uuid)or nexora_food_private.nexora_is_admin()))with check(bucket_id in('nexora-food-restaurants','nexora-food-menu')and(nexora_food_private.nexora_member((storage.foldername(name))[1]::uuid)or nexora_food_private.nexora_is_admin()));
create policy nexora_food_images_delete on storage.objects for delete to authenticated using(bucket_id in('nexora-food-restaurants','nexora-food-menu')and(nexora_food_private.nexora_member((storage.foldername(name))[1]::uuid)or nexora_food_private.nexora_is_admin()));
create policy nexora_food_avatar_read on storage.objects for select to authenticated using(bucket_id='nexora-food-avatars'and(storage.foldername(name))[1]=auth.uid()::text);
create policy nexora_food_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='nexora-food-avatars'and(storage.foldername(name))[1]=auth.uid()::text);
create policy nexora_food_avatar_update on storage.objects for update to authenticated using(bucket_id='nexora-food-avatars'and(storage.foldername(name))[1]=auth.uid()::text)with check(bucket_id='nexora-food-avatars'and(storage.foldername(name))[1]=auth.uid()::text);
create policy nexora_food_avatar_delete on storage.objects for delete to authenticated using(bucket_id='nexora-food-avatars'and(storage.foldername(name))[1]=auth.uid()::text);

create unique index nexora_food_nexora_one_gateway_per_order on public.nexora_food_payments(order_id);
create function public.nexora_food_admin_record_action(p_entity text,p_id uuid,p_value text,p_reason text)returns void language plpgsql security definer set search_path=public as $$declare points integer;begin if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason required';end if;case p_entity when 'Support'then if p_value not in('pending','resolved','closed')then raise exception 'Invalid ticket status';end if;update public.nexora_food_support_tickets set status=p_value where id=p_id;when 'Settlements'then if p_value not in('approved','paid')then raise exception 'Invalid settlement status';end if;update public.nexora_food_restaurant_settlements set status=p_value,paid_ref=case when p_value='paid'then p_reason else paid_ref end where id=p_id;when 'Deletion requests'then if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;if p_value not in('processing','rejected')then raise exception 'Use the retention-aware deletion job to complete requests';end if;update public.nexora_food_deletion_requests set status=p_value,notes=p_reason where id=p_id;when 'Rewards'then points:=p_value::integer;if points=0 or abs(points)>100000 then raise exception 'Invalid adjustment';end if;perform 1 from public.nexora_food_loyalty_accounts where user_id=p_id for update;if not found then raise exception 'Loyalty account not found';end if;insert into public.nexora_food_loyalty_ledger(user_id,type,points,ref,reason,created_by)values(p_id,'adjustment',points,'admin:'||gen_random_uuid(),p_reason,auth.uid());else raise exception 'Unsupported operation';end case;insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'update',p_entity,p_id::text,jsonb_build_object('value',p_value),p_reason);end$$;
revoke all on function public.nexora_food_admin_record_action(text,uuid,text,text)from public,anon;grant execute on function public.nexora_food_admin_record_action(text,uuid,text,text)to authenticated;

revoke all on function public.nexora_food_set_updated_at() from public,anon,authenticated;

-- Food-only application additions; appended to shared-food-backend.sql before initial deployment.
alter table public.nexora_food_restaurants add column cuisines text[] not null default '{}',
 add column gallery_urls text[] not null default '{}',add column menu_pages text[] not null default '{}',
 add column amenities text[] not null default '{}',add column dining_type text,
 add column booking_offer jsonb,add column bank_offer jsonb,add column promo_offer jsonb,
 add column special_tags jsonb not null default '[]',add column dining_offers jsonb not null default '[]',
 add constraint nexora_food_jaipur_restaurant check(lower(trim(city))='jaipur');
alter table public.nexora_food_user_addresses add constraint nexora_food_jaipur_address check(lower(trim(city))='jaipur' and lower(trim(state))='rajasthan');
create table public.nexora_food_locations(id uuid primary key default gen_random_uuid(),city text not null default 'Jaipur' check(city='Jaipur'),state text not null default 'Rajasthan',locality text not null unique,is_active boolean not null default true);
alter table public.nexora_food_locations enable row level security;
grant select on public.nexora_food_locations to anon,authenticated;
grant all on public.nexora_food_locations to service_role;
create policy food_locations_read on public.nexora_food_locations for select to anon,authenticated using(is_active);
insert into public.nexora_food_locations(locality) select unnest(array['C Scheme','Malviya Nagar','Vaishali Nagar','Mansarovar','Raja Park','Tonk Road','Jagatpura','Pratap Nagar','Sanganer','Civil Lines','Bani Park','Vidhyadhar Nagar','Shastri Nagar','Jhotwara','Sodala','Ajmer Road','Adarsh Nagar','Jawahar Nagar']);
insert into public.nexora_food_food_categories(name,sort_order)select name,ord from unnest(array['Biryani','Pizza','Burgers','South Indian','North Indian','Healthy','Desserts'])with ordinality a(name,ord);
insert into public.nexora_food_app_settings(key,value)values('cod.enabled','true'),('cod.max_paise','1000000'),('payments.online_enabled','false'),('delivery.flat_paise','2900'),('tax.bps','0'),('loyalty.earn_per_paise','10000'),('loyalty.redeem_paise_per_100_points','10000')on conflict(key)do nothing;
insert into public.nexora_food_profiles(id,email,phone,full_name)select id,email,phone,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),120)from auth.users on conflict(id)do nothing;
insert into public.nexora_food_user_roles(user_id,role)select id,'customer'from auth.users on conflict do nothing;
insert into public.nexora_food_loyalty_accounts(user_id)select id from auth.users on conflict do nothing;
-- Bootstrap only the Site owner's existing verified account, without changing salon roles.
insert into public.nexora_food_user_roles(user_id,role)select id,'super_admin'from auth.users where lower(email)='templateapp67@gmail.com' and email_confirmed_at is not null on conflict do nothing;
insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)select u.id,'bootstrap-super-admin','nexora_food_user_roles',u.id::text,'Initialize Food administration for the existing Site owner'from auth.users u join public.nexora_food_user_roles r on r.user_id=u.id and r.role='super_admin';

create function public.nexora_food_ensure_account()returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid()is null then raise exception 'Sign in required';end if;
 insert into public.nexora_food_profiles(id,email,phone,full_name)select id,email,phone,left(coalesce(raw_user_meta_data->>'full_name',''),120)from auth.users where id=auth.uid()on conflict(id)do nothing;
 insert into public.nexora_food_user_roles(user_id,role)values(auth.uid(),'customer')on conflict do nothing;
 insert into public.nexora_food_loyalty_accounts(user_id)values(auth.uid())on conflict do nothing;
end$$;

create function public.nexora_food_save_account(p_name text,p_phone text,p_avatar text default null)returns void language plpgsql security definer set search_path=public as $$begin
 perform public.nexora_food_ensure_account();
 if p_name is null or length(trim(p_name))not between 1 and 120 then raise exception 'Enter a name between 1 and 120 characters';end if;
 if coalesce(p_phone,'')<>''and p_phone!~'^\+?[0-9]{10,15}$'then raise exception 'Invalid phone number';end if;
 if coalesce(p_avatar,'')<>''and p_avatar!~('^'||auth.uid()::text||'/[a-zA-Z0-9._-]+$')then raise exception 'Avatar must belong to your account';end if;
 update public.nexora_food_profiles set full_name=trim(p_name),phone=nullif(p_phone,''),avatar_url=coalesce(nullif(p_avatar,''),avatar_url)where id=auth.uid();
end$$;

create function public.nexora_food_apply_restaurant(p_data jsonb)returns uuid language plpgsql security definer set search_path=public,extensions as $$declare rid uuid;lat numeric:=(p_data->>'latitude')::numeric;lng numeric:=(p_data->>'longitude')::numeric;begin
 perform public.nexora_food_ensure_account();
 if exists(select 1 from public.nexora_food_profiles where id=auth.uid()and is_blocked)then raise exception 'Account blocked';end if;
 if p_data->>'slug'is null or p_data->>'slug'!~'^[a-z0-9]+(-[a-z0-9]+)*$'then raise exception 'Invalid URL slug';end if;
 if lat is null or lng is null or lat not between 26.5 and 27.4 or lng not between 75.3 and 76.3 then raise exception 'Choose a location in the Jaipur launch area';end if;
 if(select count(*)from public.nexora_food_restaurant_members where user_id=auth.uid()and role='owner')>=5 then raise exception 'Restaurant application limit reached';end if;
 insert into public.nexora_food_restaurants(name,slug,address,city,location,phone,description)values(trim(p_data->>'name'),p_data->>'slug',trim(p_data->>'address'),'Jaipur',extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography,p_data->>'phone',p_data->>'description')returning id into rid;
 insert into public.nexora_food_restaurant_members(restaurant_id,user_id,role)values(rid,auth.uid(),'owner');
 insert into public.nexora_food_user_roles(user_id,role)values(auth.uid(),'restaurant_owner')on conflict do nothing;
 return rid;
end$$;

create or replace function public.nexora_food_admin_role(p_user uuid,p_role text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason required';end if;
 if not exists(select 1 from public.nexora_food_profiles where id=p_user)then raise exception 'Food account not found';end if;
 insert into public.nexora_food_user_roles(user_id,role)values(p_user,p_role::public.nexora_food_app_role)on conflict do nothing;
 if p_role='rider'then insert into public.nexora_food_delivery_partners(user_id,name,phone)select id,coalesce(nullif(full_name,''),'Rider'),phone from public.nexora_food_profiles where id=p_user on conflict(user_id)do update set is_active=true;end if;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'grant-role','user_roles',p_user::text,jsonb_build_object('role',p_role),p_reason);
end$$;
create function public.nexora_food_admin_member(p_restaurant uuid,p_user uuid,p_role text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;
 if p_role not in('owner','staff')or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Invalid membership';end if;
 insert into public.nexora_food_restaurant_members(restaurant_id,user_id,role)values(p_restaurant,p_user,p_role)on conflict(restaurant_id,user_id)do update set role=excluded.role;
 insert into public.nexora_food_user_roles(user_id,role)values(p_user,case when p_role='owner'then 'restaurant_owner'::public.nexora_food_app_role else 'restaurant_staff'::public.nexora_food_app_role end)on conflict do nothing;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'assign-member','restaurant_members',p_restaurant::text,jsonb_build_object('user',p_user,'role',p_role),p_reason);
end$$;

create function public.nexora_food_save_listing(p_restaurant uuid,p_changes jsonb)returns void language plpgsql security definer set search_path=public as $$declare u text;begin
 if auth.uid()is null or not(nexora_food_private.nexora_member(p_restaurant)or nexora_food_private.nexora_is_admin())then raise exception 'Access denied';end if;
 if coalesce(p_changes->>'cover_url','')<>'' and p_changes->>'cover_url'!~'^https://'then raise exception 'Image URL must use HTTPS';end if;
 for u in select jsonb_array_elements_text(coalesce(p_changes->'gallery_urls','[]')) union all select jsonb_array_elements_text(coalesce(p_changes->'menu_pages','[]'))loop if u!~'^https://'then raise exception 'Photo URL must use HTTPS';end if;end loop;
 update public.nexora_food_restaurants set phone=left(p_changes->>'phone',30),description=left(p_changes->>'description',2000),prep_time_min=(p_changes->>'prep_time_min')::integer,is_temporarily_closed=(p_changes->>'is_temporarily_closed')::boolean,cover_url=nullif(p_changes->>'cover_url',''),cuisines=array(select jsonb_array_elements_text(coalesce(p_changes->'cuisines','[]'))),gallery_urls=array(select jsonb_array_elements_text(coalesce(p_changes->'gallery_urls','[]'))),menu_pages=array(select jsonb_array_elements_text(coalesce(p_changes->'menu_pages','[]'))),amenities=array(select jsonb_array_elements_text(coalesce(p_changes->'amenities','[]'))),avg_cost_for_two_paise=(p_changes->>'avg_cost_for_two_paise')::bigint,dining_type=nullif(p_changes->>'dining_type','')where id=p_restaurant;
end$$;

create function public.nexora_food_submit_rider_application(p_name text,p_phone text)returns void language plpgsql security definer set search_path=public as $$begin
 perform public.nexora_food_ensure_account();
 if p_name is null or length(trim(p_name))not between 1 and 120 or p_phone is null or p_phone!~'^\+?[0-9]{10,15}$'then raise exception 'Enter a valid rider name and phone';end if;
 insert into public.nexora_food_delivery_partners(user_id,name,phone,is_active)values(auth.uid(),trim(p_name),p_phone,false)on conflict(user_id)do update set name=excluded.name,phone=excluded.phone;
end$$;
create function public.nexora_food_rider_location(p_order uuid,p_lat numeric,p_lng numeric)returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid()is null or not exists(select 1 from public.nexora_food_delivery_assignments where order_id=p_order and partner_id=auth.uid())then raise exception 'Assigned rider required';end if;
 if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Invalid coordinates';end if;
 update public.nexora_food_delivery_assignments set last_latitude=p_lat,last_longitude=p_lng,location_updated_at=now()where order_id=p_order;
end$$;
alter table public.nexora_food_delivery_assignments add column last_latitude numeric,add column last_longitude numeric,add column location_updated_at timestamptz;

create function public.nexora_food_submit_item_review(p_order_item uuid,p_rating integer,p_body text)returns uuid language plpgsql security definer set search_path=public as $$declare i public.nexora_food_order_items;o public.nexora_food_orders;rid uuid;begin
 select *into i from public.nexora_food_order_items where id=p_order_item;select *into o from public.nexora_food_orders where id=i.order_id and user_id=auth.uid();
 if not found or o.status<>'delivered' or o.delivered_at<now()-interval '14 days'then raise exception 'Only eligible delivered dishes can be reviewed';end if;
 insert into public.nexora_food_food_item_reviews(user_id,menu_item_id,order_item_id,rating,body)values(auth.uid(),i.menu_item_id,i.id,p_rating,left(p_body,2000))on conflict(order_item_id)do update set rating=excluded.rating,body=excluded.body returning id into rid;
 update public.nexora_food_menu_items set rating_avg=(select round(avg(rating)::numeric,2)from public.nexora_food_food_item_reviews where menu_item_id=i.menu_item_id and status='visible'),rating_count=(select count(*)from public.nexora_food_food_item_reviews where menu_item_id=i.menu_item_id and status='visible')where id=i.menu_item_id;return rid;
end$$;
-- Efficient foreign-key lookups for Food RLS and operational dashboards.
create index nexora_food_assignments_partner on public.nexora_food_delivery_assignments(partner_id);
create index nexora_food_reviews_restaurant on public.nexora_food_restaurant_reviews(restaurant_id,created_at desc);
create index nexora_food_food_reviews_item on public.nexora_food_food_item_reviews(menu_item_id);
create index nexora_food_history_order on public.nexora_food_order_status_history(order_id,created_at);
create index nexora_food_notifications_user on public.nexora_food_user_notifications(user_id,created_at desc);
create index nexora_food_support_user on public.nexora_food_support_tickets(user_id);
create index nexora_food_ledger_user on public.nexora_food_loyalty_ledger(user_id,created_at desc);
create policy food_payment_read on public.nexora_food_payments for select to authenticated using(nexora_food_private.nexora_is_admin()or exists(select 1 from public.nexora_food_orders where id=order_id and user_id=auth.uid()));
create policy food_refund_read on public.nexora_food_refunds for select to authenticated using(nexora_food_private.nexora_is_admin()or exists(select 1 from public.nexora_food_orders where id=order_id and user_id=auth.uid()));
create policy food_redemption_read on public.nexora_food_coupon_redemptions for select to authenticated using(user_id=auth.uid()or nexora_food_private.nexora_is_admin());
create policy food_search_read on public.nexora_food_search_history for select to authenticated using(user_id=auth.uid());
-- Explicit permissions only for the newly introduced Food endpoints.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('nexora_food_ensure_account','nexora_food_save_account','nexora_food_apply_restaurant','nexora_food_admin_member','nexora_food_save_listing','nexora_food_submit_rider_application','nexora_food_rider_location','nexora_food_submit_item_review')loop execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated,service_role',f.signature);end loop;end$$;
