-- 002: profiles, roles, addresses, restaurants, members, hours, zones
-- RLS is ENABLED here with no policies = deny-all for anon/authenticated until
-- migration 007 adds policies. This is deliberate (safe by default).

set search_path = public, extensions;

create table public.profiles (
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
create unique index profiles_phone_key on public.profiles(phone) where phone is not null;
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
alter table public.profiles enable row level security;

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create table public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
create index user_addresses_user_idx on public.user_addresses(user_id) where deleted_at is null;
create unique index user_addresses_one_default on public.user_addresses(user_id)
  where is_default and deleted_at is null;
create trigger user_addresses_updated before update on public.user_addresses
  for each row execute function public.set_updated_at();
alter table public.user_addresses enable row level security;

create table public.restaurants (
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
create index restaurants_location_gix on public.restaurants using gist (location);
create index restaurants_name_trgm on public.restaurants using gin (name extensions.gin_trgm_ops);
create index restaurants_status_idx on public.restaurants(status);
create trigger restaurants_updated before update on public.restaurants
  for each row execute function public.set_updated_at();
alter table public.restaurants enable row level security;

create table public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_members_user_idx on public.restaurant_members(user_id);
alter table public.restaurant_members enable row level security;

-- Multiple rows per weekday allowed (split shifts). closes < opens means it runs past midnight.
create table public.restaurant_hours (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time,
  closes time,
  is_closed boolean not null default false,
  check (is_closed or (opens is not null and closes is not null))
);
create index restaurant_hours_rest_idx on public.restaurant_hours(restaurant_id, weekday);
alter table public.restaurant_hours enable row level security;

-- restaurant_id NULL = platform-wide zone
create table public.restaurant_delivery_zones (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  center geography(Point,4326),
  radius_m integer check (radius_m is null or radius_m > 0),
  polygon geography(Polygon,4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (polygon is not null or (center is not null and radius_m is not null))
);
create index delivery_zones_rest_idx on public.restaurant_delivery_zones(restaurant_id);
create index delivery_zones_polygon_gix on public.restaurant_delivery_zones using gist (polygon);
alter table public.restaurant_delivery_zones enable row level security;
