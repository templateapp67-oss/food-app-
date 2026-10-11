# 05_SCHEMA — Database, RLS, Functions

Conventions: `uuid` PKs (`gen_random_uuid()`), `created_at/updated_at timestamptz default now()` with `set_updated_at` trigger, money = `*_paise bigint check (>=0)`, `currency text default 'INR' check (currency='INR')`, soft-delete via `deleted_at` where history matters, enums as Postgres enums or checked text. Migrations are append-only.

## 1. Enums
```sql
create type app_role as enum ('customer','restaurant_owner','restaurant_staff','rider','support','admin','super_admin');
create type order_status as enum ('pending_payment','placed','confirmed','preparing','ready_for_pickup','out_for_delivery','delivered','rejected','cancelled');
create type payment_status as enum ('none','cod_pending','pending','paid','failed','cod_collected','refund_pending','partially_refunded','refunded');
create type refund_status as enum ('requested','processing','succeeded','failed');
create type payment_method as enum ('cod','online');
create type ledger_type as enum ('earn','redeem','expire','reversal','adjustment');
```

## 2. Tables (core columns; add indexes noted)
**profiles**(id=auth.users.id, full_name, phone, email, avatar_url, preferred_lang, marketing_opt_in, deletion_requested_at, is_blocked) — idx phone unique.
**user_roles**(user_id, role app_role, unique(user_id,role)) — written only by admin functions.
**user_addresses**(id, user_id, type[home|work|other], line1, line2, landmark, locality, city, state, pincode check ~ '^[1-9][0-9]{5}$', location geography(Point), instructions, is_default, deleted_at) — idx user_id.
**restaurants**(id, name, slug unique, description, logo_url, cover_url, address, city, location geography, phone, fssai_no, gstin, status[pending|active|suspended|inactive], is_temporarily_closed, prep_time_min, avg_cost_for_two_paise, min_order_paise, delivery_fee_override_paise null, commission_bps, rating_avg numeric(3,2), rating_count int, is_veg_only, is_demo) — gist(location), gin trigram(name).
**restaurant_members**(restaurant_id, user_id, role[owner|staff], unique pair).
**restaurant_hours**(restaurant_id, weekday 0-6, opens time, closes time, is_closed; supports multiple rows/day).
**restaurant_delivery_zones**(id, restaurant_id null=global, name, center geography, radius_m, polygon geography null, is_active).
**food_categories**(id, name, image_url, sort_order, is_active) — home chips (Biryani, Pizza…).
**restaurant_cuisines**(restaurant_id, food_category_id).
**menu_categories**(id, restaurant_id, name, sort_order, is_active).
**menu_items**(id, restaurant_id, menu_category_id, name, description, image_url, price_paise, mrp_paise null, is_veg, is_available, is_bestseller, rating_avg, rating_count, tax_class, sort_order, deleted_at) — gin trigram(name), idx(restaurant_id).
**menu_item_variants**(id, item_id, name, price_delta_paise >= 0 (added to item base price), is_default, is_available, sort_order) — one default per item (partial unique index). *Implemented in migration 003.*
**menu_addon_groups**(id, item_id, name, min_select, max_select, is_required) **+ menu_item_addons**(id, group_id, name, price_paise, is_available). (Replaces flat addons so required/optional/limits are enforceable.)
**favorites**(id, user_id, restaurant_id null, menu_item_id null, check exactly one set, unique partial indexes).
**coupons**(id, code citext unique, type[percent|flat], value, max_discount_paise, min_order_paise, starts_at, ends_at, usage_limit_total, usage_limit_per_user, restaurant_id null, first_order_only, is_active, stackable bool default false).
**coupon_redemptions**(id, coupon_id, user_id, order_id unique, discount_paise).
**orders**(id, order_number unique (human, e.g. ML-YYMMDD-xxxx), user_id, restaurant_id, address_snapshot jsonb, status order_status, payment_method, payment_status, items_subtotal_paise, discount_coupon_paise, discount_loyalty_paise, delivery_fee_paise, packaging_paise, platform_fee_paise, tax_paise, tip_paise, total_paise, points_redeemed int, points_earned int, special_instructions, idempotency_key, estimated_delivery_at, placed_at, accepted_at, delivered_at, cancelled_at, cancel_reason, cancelled_by, restaurant_name_snapshot, is_demo) — unique(user_id, idempotency_key); idx(user_id, created_at desc), idx(restaurant_id, status).
**order_items**(id, order_id, menu_item_id null, name_snapshot, unit_price_paise, quantity check>0, variant_snapshot jsonb, line_total_paise, is_veg, instructions).
**order_item_customizations**(id, order_item_id, group_name, option_name, price_paise).
**order_status_history**(id, order_id, from_status, to_status, actor_id, actor_role, note, created_at) — insert-only.
**payments**(id, order_id, provider, provider_order_id, provider_payment_id, amount_paise, status, method, signature_verified bool, raw_event_id, created_at) — unique(provider, provider_payment_id).
**refunds**(id, payment_id, order_id, amount_paise, reason, status refund_status, provider_refund_id, requested_by, created_at).
**webhook_events**(id, provider, event_id unique per provider, payload jsonb, processed_at, status) — replay protection.
**idempotency_keys**(key, user_id, scope, request_hash, response jsonb, created_at, expires_at; pk(user_id,scope,key)).
**restaurant_reviews**(id, user_id, restaurant_id, order_id, rating smallint check 1..5, body, status[visible|hidden|reported], edited_until, unique(order_id, restaurant_id)).
**food_item_reviews**(id, user_id, menu_item_id, order_item_id unique, rating 1..5, body, status).
**review_reports**(id, review_type, review_id, reporter_id, reason, status, resolved_by) .
**loyalty_accounts**(user_id pk, balance_points int check>=0 (cache, maintained by trigger from ledger), lifetime_points int, tier text).
**loyalty_ledger**(id, user_id, type ledger_type, points int (signed), order_id null, ref text, expires_at, reason, created_by, created_at) — **unique(order_id, type) where type in ('earn','reversal')** for idempotency; insert-only (no update/delete policies).
**loyalty_tiers**(name, min_lifetime_points, benefits jsonb, is_active) — config.
**device_tokens**(id, user_id, token unique, platform, app_version, last_seen_at, is_active).
**user_notifications**(id, user_id, type, title, body, data jsonb, order_id null, read_at, dedupe_key unique).
**notification_templates**(key, title, body, is_active).
**support_tickets**(id, user_id, order_id null, subject, body, status[open|pending|resolved|closed], assigned_to, priority).
**app_settings**(key pk, value jsonb, updated_by) — platform fee, tax rates, delivery slabs, loyalty rules, cancel windows, min app version, support contact, COD cap, feature flags.
**admin_audit_logs**(id, actor_id, action, entity, entity_id, before jsonb, after jsonb, reason, ip, created_at) — insert-only.
**delivery_partners**(user_id pk, name, phone, restaurant_id null, is_active).
**delivery_assignments**(id, order_id unique active, partner_id, assigned_by, status[assigned|picked_up|delivered|failed], timestamps).
**restaurant_settlements**(id, restaurant_id, period_start, period_end, gross_paise, commission_paise, tax_on_commission_paise, refunds_paise, net_payable_paise, status[draft|approved|paid], paid_ref).
**deletion_requests**(id, user_id, requested_at, status[requested|processing|completed|rejected], notes).
**search_history**(user_id, query, created_at) — optional, capped per user.

## 3. Key SQL patterns
```sql
-- helpers
create function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from user_roles where user_id=auth.uid() and role in ('admin','super_admin')) $$;
create function is_restaurant_member(rid uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from restaurant_members where restaurant_id=rid and user_id=auth.uid()) $$;

-- ledger idempotency
create unique index loyalty_earn_once on loyalty_ledger(order_id) where type='earn';
create unique index loyalty_reversal_once on loyalty_ledger(order_id) where type='reversal';

-- redemption safety: inside one transaction
-- select balance_points from loyalty_accounts where user_id=$1 for update;
-- reject if balance < requested; insert ledger(redeem,-n); (trigger updates cache)

-- rating aggregate (trigger on review insert/update/delete)
-- update restaurants set rating_avg=(select round(avg(rating)::numeric,2) ...), rating_count=... where id=...
```

## 4. RLS matrix (enable RLS on every table below)
| Table | Customer | Restaurant member | Admin/support | Notes |
|---|---|---|---|---|
| profiles | select/update own (not role/is_blocked) | read names of own-order customers via view only | all | column-limited update via RPC or trigger guard |
| user_addresses | own CRUD | read snapshot only (orders) | support read | |
| restaurants | read where status='active' | update permitted columns only (RPC or column grant) | all | owners cannot change status/commission |
| menu_* | read active | CRUD own restaurant | all | |
| orders | select own; **no direct insert/update** | select own restaurant; update only through `order-transition` | select all (support limited cols) | |
| order_items/history | via parent order | via parent | all | insert-only history |
| payments/refunds | select own (limited cols) | none (summary view) | all | writes service-role only |
| reviews | insert via RPC (eligibility), select visible, update own within window | read own restaurant | moderate | |
| loyalty_* | select own | none | select all, adjust via RPC | no client writes |
| favorites | own CRUD | none | none | |
| device_tokens | own upsert/delete | none | none | |
| user_notifications | own select/update read_at | none | none | |
| coupons | read active & eligible via RPC | restaurant-scoped read | CRUD | validate server-side only |
| app_settings | read whitelisted public keys via view | same | write | |
| admin_audit_logs, webhook_events, idempotency_keys | none | none | read audit | service-role writes |

## 5. Storage policies
- `restaurant-media`, `menu-media`: public read; write only if `is_restaurant_member(folder restaurant_id)` or admin; path convention `{restaurant_id}/…`; max size 5 MB; allowed mime jpeg/png/webp.
- `avatars`: path `{user_id}/…`, owner only.

## 6. Required RPCs
`search_catalog(q, filters, sort, limit, offset)`, `nearby_restaurants(lat,lng,limit,offset)`, `check_serviceability(restaurant_id, lat, lng)`, `submit_review(...)`, `report_review(...)`, `toggle_favorite(...)`, `get_loyalty_summary()`, `register_device_token(...)`, `request_account_deletion()`.

## 7. Indexing & performance
Trigram + FTS on names, gist on geography, composite indexes listed above, partial indexes on active rows. Pagination = keyset where lists are large.

## 8. Seed data
Demo restaurants/menus/categories flagged `is_demo=true`; admin seed user created via script (never committed password). Release build excludes demo flag.

## 9. Migration order (001–003 written & tested: see /supabase/migrations)
001 extensions/enums → 002 core tables → 003 menu → 004 orders/payments → 005 reviews/loyalty → 006 notifications/support/settings/audit → 007 RLS+policies → 008 functions/triggers → 009 storage → 010 cron → 011 seed (local only).
