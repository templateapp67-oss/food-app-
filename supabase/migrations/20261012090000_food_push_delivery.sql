-- Food push queue. No shared Auth settings or other-product objects are modified.
alter table public.nexora_food_device_tokens add column updated_at timestamptz not null default now();
revoke insert,delete on public.nexora_food_device_tokens from authenticated;
create table public.nexora_food_notification_deliveries (
 notification_id uuid primary key references public.nexora_food_user_notifications(id) on delete cascade,
 status text not null default 'pending' check(status in('pending','sent','failed','no_token')),
 attempts integer not null default 0, last_error text, next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table nexora_food_private.push_attempts (
 notification_id uuid not null references public.nexora_food_notification_deliveries(notification_id) on delete cascade,
 token_id uuid not null references public.nexora_food_device_tokens(id) on delete cascade,
 token_version timestamptz not null, claim uuid, status text not null default 'pending' check(status in('pending','sending','sent','failed','unknown')),
 attempts integer not null default 0, last_error text, next_attempt_at timestamptz not null default now(), started_at timestamptz,
 primary key(notification_id,token_id)
);
alter table public.nexora_food_notification_deliveries enable row level security;
alter table nexora_food_private.push_attempts enable row level security;
create policy food_push_admin_read on public.nexora_food_notification_deliveries for select to authenticated using(nexora_food_private.nexora_is_super_admin());
create policy food_push_internal on nexora_food_private.push_attempts for all to authenticated,anon using(false) with check(false);
revoke all on public.nexora_food_notification_deliveries,nexora_food_private.push_attempts from public,anon,authenticated;
grant select on public.nexora_food_notification_deliveries to authenticated;
grant all on public.nexora_food_notification_deliveries,nexora_food_private.push_attempts to service_role;
create index food_push_due on public.nexora_food_notification_deliveries(next_attempt_at) where status='pending';
create function nexora_food_private.register_device_token(p_token text,p_platform text,p_app_version text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null or not exists(select 1 from public.nexora_food_profiles where id=auth.uid() and not is_blocked) then raise exception 'Active sign-in required';end if;
 if coalesce(length(p_token),0) not between 20 and 4096 or p_token ~ '[[:space:]]' or p_platform is null or p_platform not in('web','android','ios') or length(coalesce(p_app_version,''))>80 then raise exception 'Invalid device token or platform';end if;
 if exists(select 1 from public.nexora_food_deletion_requests where user_id=auth.uid() and status in('processing','completed')) then raise exception 'Account deletion is processing';end if;
 insert into public.nexora_food_device_tokens(user_id,token,platform,app_version,last_seen_at,is_active) values(auth.uid(),p_token,p_platform,p_app_version,now(),true)
 on conflict(token) do update set user_id=excluded.user_id,platform=excluded.platform,app_version=excluded.app_version,last_seen_at=now(),is_active=true,updated_at=clock_timestamp() returning id into result;return result;
end$$;
create function nexora_food_private.unregister_device_token(p_token text) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 update public.nexora_food_device_tokens set is_active=false,updated_at=clock_timestamp() where user_id=auth.uid() and token=p_token;
end$$;
create function nexora_food_private.enqueue_push() returns trigger language plpgsql security definer set search_path='' as $$
declare event text;begin
 event:=coalesce(new.data->>'event',split_part(coalesce(new.dedupe_key,''),':',2));
 if new.type='order' and new.order_id is not null and event in('confirmed','preparing','out_for_delivery','delivered','cancelled','rejected') then
  insert into public.nexora_food_notification_deliveries(notification_id) values(new.id) on conflict do nothing;
 end if;return new;
end$$;
create trigger food_enqueue_push after insert on public.nexora_food_user_notifications for each row execute function nexora_food_private.enqueue_push();
-- Covers system timeout cancellations/rejections too; transition RPC notifications dedupe with this trigger.
create function nexora_food_private.order_push_event() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status is distinct from old.status and new.user_id is not null and new.status in('confirmed','preparing','out_for_delivery','delivered','cancelled','rejected') then
 insert into public.nexora_food_user_notifications(user_id,type,title,body,order_id,data,dedupe_key) values(new.user_id,'order','Order update','Open Nexora Food for order status.',new.id,jsonb_build_object('event',new.status::text),new.id::text||':'||new.status::text) on conflict(dedupe_key) do nothing;
 end if;return new;end$$;
create trigger food_order_push_event after update of status on public.nexora_food_orders for each row execute function nexora_food_private.order_push_event();
create function nexora_food_private.claim_push(p_notification uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.nexora_food_user_notifications;d public.nexora_food_notification_deliveries;result jsonb;begin
 select * into d from public.nexora_food_notification_deliveries where notification_id=p_notification for update;
 if not found or d.status<>'pending' or d.next_attempt_at>now() then return '[]'::jsonb;end if;
 select * into n from public.nexora_food_user_notifications where id=p_notification;
 if not exists(select 1 from public.nexora_food_profiles where id=n.user_id and not is_blocked) or exists(select 1 from public.nexora_food_deletion_requests where user_id=n.user_id and status in('processing','completed')) then
 update public.nexora_food_notification_deliveries set status='failed',last_error='account_unavailable' where notification_id=p_notification;return '[]'::jsonb;end if;
 insert into nexora_food_private.push_attempts(notification_id,token_id,token_version) select p_notification,id,updated_at from public.nexora_food_device_tokens where user_id=n.user_id and is_active on conflict do nothing;
 -- An interrupted network attempt is ambiguous. Never resend it automatically.
 update nexora_food_private.push_attempts set status='unknown',last_error='ambiguous_provider_result' where notification_id=p_notification and status='sending' and started_at<now()-interval '5 minutes';
 update nexora_food_private.push_attempts a set status='failed',last_error='token_owner_changed' where a.notification_id=p_notification and a.status='pending' and not exists(select 1 from public.nexora_food_device_tokens t where t.id=a.token_id and t.user_id=n.user_id and t.updated_at=a.token_version and t.is_active);
 with claimed as(update nexora_food_private.push_attempts set status='sending',claim=gen_random_uuid(),attempts=attempts+1,started_at=now() where notification_id=p_notification and status='pending' and next_attempt_at<=now() and attempts<5 returning *)
 select coalesce(jsonb_agg(jsonb_build_object('token_id',a.token_id,'token',t.token,'claim',a.claim,'order_id',n.order_id,'notification_id',n.id,'event',coalesce(n.data->>'event',split_part(n.dedupe_key,':',2)))),'[]') into result from claimed a join public.nexora_food_device_tokens t on t.id=a.token_id;
 update public.nexora_food_notification_deliveries set attempts=attempts+1,next_attempt_at=now()+interval '5 minutes',status=case when not exists(select 1 from nexora_food_private.push_attempts where notification_id=p_notification) then 'no_token' when not exists(select 1 from nexora_food_private.push_attempts where notification_id=p_notification and status in('pending','sending')) then case when exists(select 1 from nexora_food_private.push_attempts where notification_id=p_notification and status='sent') then 'sent' else 'failed' end else 'pending' end where notification_id=p_notification;
 return result;
end$$;
create function nexora_food_private.finish_push(p_notification uuid,p_token uuid,p_claim uuid,p_result text) returns void language plpgsql security definer set search_path='' as $$
declare a nexora_food_private.push_attempts;begin
 if p_result is null or p_result not in('sent','retry','invalid','failed','unknown','configuration_missing') then raise exception 'Invalid delivery result';end if;
 select * into a from nexora_food_private.push_attempts where notification_id=p_notification and token_id=p_token and claim=p_claim and status='sending' for update;if not found then return;end if;
 if p_result='invalid' then update public.nexora_food_device_tokens set is_active=false where id=p_token and updated_at=a.token_version;end if;
 update nexora_food_private.push_attempts set status=case when p_result='sent' then 'sent' when p_result='unknown' then 'unknown' when p_result in('retry','configuration_missing') and attempts<5 then 'pending' else 'failed' end,last_error=case when p_result='sent' then null else p_result end,next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,a.attempts)::integer)) where notification_id=p_notification and token_id=p_token;
 update public.nexora_food_notification_deliveries set status=case when exists(select 1 from nexora_food_private.push_attempts where notification_id=p_notification and status in('pending','sending')) then 'pending' when exists(select 1 from nexora_food_private.push_attempts where notification_id=p_notification and status='sent') then 'sent' else 'failed' end,last_error=case when p_result='sent' then null else p_result end,next_attempt_at=(select coalesce(min(next_attempt_at),now()) from nexora_food_private.push_attempts where notification_id=p_notification and status='pending') where notification_id=p_notification;
end$$;

create function public.nexora_food_register_device_token(p_token text,p_platform text,p_app_version text default null) returns uuid language sql security invoker set search_path='' as $$select nexora_food_private.register_device_token(p_token,p_platform,p_app_version)$$;
revoke all on function nexora_food_private.register_device_token(text,text,text),public.nexora_food_register_device_token(text,text,text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.register_device_token(text,text,text),public.nexora_food_register_device_token(text,text,text) to authenticated;

create function public.nexora_food_unregister_device_token(p_token text) returns void language sql security invoker set search_path='' as $$select nexora_food_private.unregister_device_token(p_token)$$;
revoke all on function nexora_food_private.unregister_device_token(text),public.nexora_food_unregister_device_token(text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.unregister_device_token(text),public.nexora_food_unregister_device_token(text) to authenticated;

create function public.nexora_food_claim_push(p_notification uuid) returns jsonb language sql security invoker set search_path='' as $$select nexora_food_private.claim_push(p_notification)$$;
revoke all on function nexora_food_private.claim_push(uuid),public.nexora_food_claim_push(uuid) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.claim_push(uuid),public.nexora_food_claim_push(uuid) to service_role;

create function public.nexora_food_finish_push(p_notification uuid,p_token uuid,p_claim uuid,p_result text) returns void language sql security invoker set search_path='' as $$select nexora_food_private.finish_push(p_notification,p_token,p_claim,p_result)$$;
revoke all on function nexora_food_private.finish_push(uuid,uuid,uuid,text),public.nexora_food_finish_push(uuid,uuid,uuid,text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.finish_push(uuid,uuid,uuid,text),public.nexora_food_finish_push(uuid,uuid,uuid,text) to service_role;

revoke all on function nexora_food_private.enqueue_push(),nexora_food_private.order_push_event() from public,anon,authenticated;
notify pgrst,'reload schema';
