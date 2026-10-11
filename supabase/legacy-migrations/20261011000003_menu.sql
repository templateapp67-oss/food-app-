-- 003: categories, menu, variants, add-ons, favorites
-- Variants use price_delta_paise (added to item base price). RLS enabled, deny-all until 007.

set search_path = public, extensions;

create table public.food_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.food_categories enable row level security;

create table public.restaurant_cuisines (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  food_category_id uuid not null references public.food_categories(id) on delete restrict,
  primary key (restaurant_id, food_category_id)
);
create index restaurant_cuisines_cat_idx on public.restaurant_cuisines(food_category_id);
alter table public.restaurant_cuisines enable row level security;

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id)   -- target for composite FK: item category must be in same restaurant
);
create index menu_categories_rest_idx on public.menu_categories(restaurant_id, sort_order);
create trigger menu_categories_updated before update on public.menu_categories
  for each row execute function public.set_updated_at();
alter table public.menu_categories enable row level security;

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
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
    references public.menu_categories(id, restaurant_id) on delete set null (menu_category_id)
);
create index menu_items_rest_idx on public.menu_items(restaurant_id) where deleted_at is null;
create index menu_items_name_trgm on public.menu_items using gin (name extensions.gin_trgm_ops);
create trigger menu_items_updated before update on public.menu_items
  for each row execute function public.set_updated_at();
alter table public.menu_items enable row level security;

create table public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  price_delta_paise bigint not null default 0 check (price_delta_paise >= 0),
  is_default boolean not null default false,
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index menu_item_variants_item_idx on public.menu_item_variants(item_id);
create unique index menu_item_variants_one_default on public.menu_item_variants(item_id) where is_default;
alter table public.menu_item_variants enable row level security;

create table public.menu_addon_groups (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.menu_items(id) on delete cascade,
  name text not null,
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  check (max_select >= min_select and max_select >= 1),
  check (not is_required or min_select >= 1)
);
create index menu_addon_groups_item_idx on public.menu_addon_groups(item_id);
alter table public.menu_addon_groups enable row level security;

create table public.menu_item_addons (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.menu_addon_groups(id) on delete cascade,
  name text not null,
  price_paise bigint not null default 0 check (price_paise >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0
);
create index menu_item_addons_group_idx on public.menu_item_addons(group_id);
alter table public.menu_item_addons enable row level security;

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(restaurant_id, menu_item_id) = 1)
);
create unique index favorites_user_restaurant_key on public.favorites(user_id, restaurant_id) where restaurant_id is not null;
create unique index favorites_user_item_key on public.favorites(user_id, menu_item_id) where menu_item_id is not null;
alter table public.favorites enable row level security;
