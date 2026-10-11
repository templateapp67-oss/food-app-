-- 001: extensions, enums, shared helpers
-- Source of truth: docs/05_SCHEMA.md §1. Append-only: never edit after applied.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists citext   with schema extensions;
create extension if not exists postgis  with schema extensions;

create type public.app_role as enum
  ('customer','restaurant_owner','restaurant_staff','rider','support','admin','super_admin');

create type public.order_status as enum
  ('pending_payment','placed','confirmed','preparing','ready_for_pickup',
   'out_for_delivery','delivered','rejected','cancelled');

create type public.payment_status as enum
  ('none','cod_pending','pending','paid','failed','cod_collected',
   'refund_pending','partially_refunded','refunded');

create type public.refund_status as enum ('requested','processing','succeeded','failed');
create type public.payment_method as enum ('cod','online');
create type public.ledger_type as enum ('earn','redeem','expire','reversal','adjustment');

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
