-- Resumable Food deletion. Shared Auth accounts with other-product rows are blocked.
alter table public.nexora_food_deletion_requests drop constraint nexora_food_deletion_requests_status_check;
alter table public.nexora_food_deletion_requests add constraint nexora_food_deletion_requests_status_check check(status in('requested','processing','completed','rejected','blocked_active_orders','cancelled'));
alter table public.nexora_food_deletion_requests add column completed_at timestamptz,add column updated_at timestamptz not null default now(),add column stage text not null default 'requested',add column blocker_code text;
drop index public.nexora_food_deletion_one_open;
create unique index nexora_food_deletion_one_open on public.nexora_food_deletion_requests(user_id) where status in('requested','processing','blocked_active_orders');
create table nexora_food_private.deletion_work (
 request_id uuid primary key references public.nexora_food_deletion_requests(id),auth_target uuid,avatar_paths text[] not null default '{}',database_done boolean not null default false,storage_done boolean not null default false,auth_done boolean not null default false,lease_until timestamptz,next_attempt_at timestamptz not null default now(),attempts integer not null default 0,last_error text
);
alter table nexora_food_private.deletion_work enable row level security;
create policy food_deletion_work_internal on nexora_food_private.deletion_work for all to anon,authenticated using(false) with check(false);
revoke all on nexora_food_private.deletion_work from public,anon,authenticated;
grant all on nexora_food_private.deletion_work to service_role;
insert into public.nexora_food_app_settings(key,value) values('deletion.retention_policy','{"reviewed":false,"financial_retention_days":null,"public_text":"Financial retention period: pending owner/legal decision. Deletion completion is disabled until reviewed."}') on conflict do nothing;
create policy food_retention_public on public.nexora_food_app_settings for select to anon,authenticated using(key='deletion.retention_policy');
-- Retained Food FK links become nullable. Never rewrite other products' relationships.
do $$declare f record;begin
 for f in select c.conname,c.conrelid::regclass tbl,a.attname,col.attnotnull from pg_constraint c join pg_namespace n on n.oid=(select relnamespace from pg_class where oid=c.conrelid) join lateral unnest(c.conkey) k on true join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k join pg_attribute col on col.attrelid=a.attrelid and col.attnum=a.attnum
 where c.contype='f' and c.confrelid='auth.users'::regclass and n.nspname='public' and c.conrelid::regclass::text in('nexora_food_orders','nexora_food_coupon_redemptions','nexora_food_restaurant_reviews','nexora_food_food_item_reviews','nexora_food_review_reports','nexora_food_loyalty_ledger','nexora_food_support_tickets','nexora_food_restaurant_documents','nexora_food_deletion_requests') loop
 execute format('alter table %s alter column %I drop not null',f.tbl,f.attname);
 execute format('alter table %s drop constraint %I',f.tbl,f.conname);
 execute format('alter table %s add constraint %I foreign key(%I) references auth.users(id) on delete set null',f.tbl,f.conname,f.attname);
 end loop;end$$;
alter table public.nexora_food_orders add column anonymized_account uuid;
alter table public.nexora_food_delivery_assignments alter column partner_id drop not null;
alter table public.nexora_food_rider_earnings alter column partner_id drop not null;
create function nexora_food_private.deletion_blockers(p_user uuid) returns text[] language plpgsql stable security definer set search_path='' as $$
declare reasons text[]:='{}';begin
 if exists(select 1 from public.nexora_food_orders o where (o.user_id=p_user or exists(select 1 from public.nexora_food_restaurant_members m where m.user_id=p_user and m.restaurant_id=o.restaurant_id) or exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=o.id and a.partner_id=p_user)) and (o.status not in('delivered','cancelled','rejected') or (o.status='delivered' and o.payment_method='cod' and o.payment_status='cod_pending'))) then reasons:=array_append(reasons,'active_orders_or_cod_due');end if;
 if exists(select 1 from public.nexora_food_user_roles where user_id=p_user and role='super_admin') and not exists(select 1 from public.nexora_food_user_roles r join public.nexora_food_profiles p on p.id=r.user_id where r.role='super_admin' and r.user_id<>p_user and not p.is_blocked) then reasons:=array_append(reasons,'last_super_admin');end if;return reasons;
end$$;
create function nexora_food_private.deletion_status() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('request',(select to_jsonb(d) from public.nexora_food_deletion_requests d where d.user_id=auth.uid() order by requested_at desc limit 1),'blockers',to_jsonb(nexora_food_private.deletion_blockers(auth.uid())),'retention',(select value from public.nexora_food_app_settings where key='deletion.retention_policy'))$$;
-- Re-auth requires a recent password AMR from the signed Supabase JWT, not merely refreshed iat.
create function nexora_food_private.request_deletion(p_confirmation text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if auth.uid() is null or p_confirmation is distinct from 'DELETE' then raise exception 'Sign in and type DELETE';end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(auth.jwt()->'amr','[]')) a where a->>'method'='password' and (a->>'timestamp')::bigint between extract(epoch from now()-interval '5 minutes') and extract(epoch from now()+interval '30 seconds')) then raise exception 'Re-enter your password before requesting deletion';end if;
 perform pg_advisory_xact_lock(hashtextextended('nexora-food-super-admin-management',0));
 if 'last_super_admin'=any(nexora_food_private.deletion_blockers(auth.uid())) then raise exception 'Keep at least one active Super Admin';end if;
 insert into public.nexora_food_deletion_requests(user_id) values(auth.uid()) on conflict(user_id) where status in('requested','processing','blocked_active_orders') do update set updated_at=public.nexora_food_deletion_requests.updated_at returning id into result;
 update public.nexora_food_profiles set deletion_requested_at=now(),marketing_opt_in=false where id=auth.uid();return result;
end$$;
-- Retire the old no-argument identity bypass.
create or replace function nexora_food_private.nexora_food_request_deletion() returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'Re-authenticate and use the confirmed deletion flow';end$$;
create function nexora_food_private.cancel_deletion(p_request uuid) returns void language plpgsql security definer set search_path='' as $$begin
 update public.nexora_food_deletion_requests set status='cancelled',updated_at=now(),blocker_code=null where id=p_request and user_id=auth.uid() and status in('requested','blocked_active_orders') and stage='requested';
 if not found then raise exception 'Only your pending request can be cancelled before processing';end if;
 update public.nexora_food_profiles set deletion_requested_at=null where id=auth.uid();
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)values(auth.uid(),'cancel-deletion','food_deletion',p_request::text,'Cancelled before processing');end$$;
create function nexora_food_private.deletion_changed() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.user_id is not null and (TG_OP='INSERT' or new.status is distinct from old.status or new.blocker_code is distinct from old.blocker_code) then
 insert into public.nexora_food_user_notifications(user_id,type,title,body,dedupe_key) values(new.user_id,'account','Account deletion update','Open Privacy & account deletion to see your request status.',new.id::text||':'||new.status||':'||coalesce(new.blocker_code,'none'))on conflict do nothing;end if;return new;end$$;
create trigger food_deletion_changed after insert or update of status,blocker_code on public.nexora_food_deletion_requests for each row execute function nexora_food_private.deletion_changed();
-- Read-only cross-product safeguard; never cascade/delete a shared platform account.
create function nexora_food_private.shared_account_linked(p_user uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare f record;linked boolean;begin
 for f in select c.conrelid::regclass tbl,a.attname from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace join lateral unnest(c.conkey) k on true join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k
 where c.contype='f' and c.confrelid='auth.users'::regclass and n.nspname not in('auth','nexora_food_private') and t.relname not like 'nexora_food_%' loop
 execute format('select exists(select 1 from %s where %I=$1)',f.tbl,f.attname)into linked using p_user;if linked then return true;end if;end loop;return false;
end$$;
create function nexora_food_private.prepare_deletion(p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.nexora_food_deletion_requests;w nexora_food_private.deletion_work;u uuid;blocks text[];begin
 select * into d from public.nexora_food_deletion_requests where id=p_request for update;if not found or d.status in('completed','cancelled','rejected') then return jsonb_build_object('ready',false);end if;
 select * into w from nexora_food_private.deletion_work where request_id=d.id for update;
 if w.lease_until>now() or w.next_attempt_at>now() then return jsonb_build_object('ready',false);end if;
 u:=coalesce(w.auth_target,d.user_id);
 perform pg_advisory_xact_lock(hashtextextended('nexora-food-super-admin-management',0));
 blocks:=nexora_food_private.deletion_blockers(u);
 if cardinality(blocks)>0 then update public.nexora_food_deletion_requests set status='blocked_active_orders',blocker_code=array_to_string(blocks,','),updated_at=now() where id=d.id;return jsonb_build_object('ready',false);end if;
 if coalesce((select (value->>'reviewed')::boolean from public.nexora_food_app_settings where key='deletion.retention_policy'),false)=false then update public.nexora_food_deletion_requests set blocker_code='retention_policy_review_required',updated_at=now() where id=d.id;return jsonb_build_object('ready',false);end if;
 if nexora_food_private.shared_account_linked(u) then update public.nexora_food_deletion_requests set blocker_code='shared_account_coordination_required',updated_at=now() where id=d.id;return jsonb_build_object('ready',false);end if;
 insert into nexora_food_private.deletion_work(request_id,auth_target,avatar_paths) select d.id,u,coalesce(array_agg(name),'{}') from storage.objects where bucket_id='nexora-food-avatars' and split_part(name,'/',1)=u::text on conflict do nothing;
 update nexora_food_private.deletion_work set lease_until=now()+interval '5 minutes',attempts=attempts+1 where request_id=d.id;
 update public.nexora_food_deletion_requests set status='processing',stage='anonymizing',blocker_code=null,notes=null,updated_at=now() where id=d.id;
 if not coalesce(w.database_done,false) then
 update public.nexora_food_profiles set full_name=null,phone=null,email=null,avatar_url=null,marketing_opt_in=false,is_blocked=true where id=u;
 delete from public.nexora_food_user_addresses where user_id=u;
 delete from public.nexora_food_device_tokens where user_id=u;
 delete from public.nexora_food_favorites where user_id=u;
 delete from public.nexora_food_search_history where user_id=u;
 delete from public.nexora_food_user_notifications where user_id=u;
 delete from nexora_food_private.cart_quotes where user_id=u;
 delete from public.nexora_food_idempotency_keys where user_id=u;
 delete from public.nexora_food_loyalty_accounts where user_id=u;
 update public.nexora_food_loyalty_ledger set user_id=case when user_id=u then null else user_id end,created_by=case when created_by=u then d.id else created_by end,reason=null where user_id=u or created_by=u;
 update public.nexora_food_orders set user_id=null,anonymized_account=d.id,address_snapshot=jsonb_build_object('locality',address_snapshot->>'locality','city','Jaipur'),special_instructions=null,cancel_reason=case when cancelled_by=u then null else cancel_reason end,cancelled_by=case when cancelled_by=u then d.id else cancelled_by end where user_id=u;
 update public.nexora_food_order_items set instructions=null where order_id in(select id from public.nexora_food_orders where anonymized_account=d.id);
 update public.nexora_food_support_tickets set user_id=null,subject='Deleted account support',body='Personal content removed',assigned_to=null,status='closed' where user_id=u;
 update public.nexora_food_support_tickets set assigned_to=null where assigned_to=u;
 update public.nexora_food_coupon_redemptions set user_id=null where user_id=u;
 update public.nexora_food_restaurant_reviews set user_id=null,body=null where user_id=u;
 update public.nexora_food_food_item_reviews set user_id=null,body=null where user_id=u;
 update public.nexora_food_review_reports set reporter_id=null,reason='Personal content removed',resolved_by=null where reporter_id=u;
 update public.nexora_food_restaurant_documents set uploaded_by=null where uploaded_by=u;
 update public.nexora_food_restaurant_documents set reviewed_by=null,review_note=null where reviewed_by=u;
 delete from public.nexora_food_restaurant_members where user_id=u;
 delete from public.nexora_food_user_roles where user_id=u;
 update public.nexora_food_delivery_assignments set partner_id=null,last_latitude=null,last_longitude=null,location_updated_at=null where partner_id=u;
 update public.nexora_food_delivery_assignments set assigned_by=d.id where assigned_by=u;
 update public.nexora_food_rider_earnings set partner_id=null where partner_id=u;
 delete from public.nexora_food_delivery_partners where user_id=u;
 update public.nexora_food_order_status_history set actor_id=d.id,note=null where actor_id=u;
 update public.nexora_food_refunds set requested_by=d.id,reason='Retained financial record' where requested_by=u;
 update public.nexora_food_app_settings set updated_by=null where updated_by=u;
 update public.nexora_food_admin_audit_logs set actor_id=case when actor_id=u then d.id else actor_id end,entity_id=case when entity_id=u::text then d.id::text else entity_id end,before=null,after=null,reason='Retained audit; personal content removed' where actor_id=u or entity_id=u::text or coalesce(before::text,'') like '%'||u::text||'%' or coalesce(after::text,'') like '%'||u::text||'%';
 update nexora_food_private.deletion_work set database_done=true where request_id=d.id;
 end if;
 update public.nexora_food_deletion_requests set stage='storage_pending' where id=d.id;
 select * into w from nexora_food_private.deletion_work where request_id=d.id;
 return jsonb_build_object('ready',true,'user_id',w.auth_target,'avatar_paths',w.avatar_paths,'storage_done',w.storage_done,'auth_done',w.auth_done);
end$$;
create function nexora_food_private.finish_deletion(p_request uuid,p_stage text) returns void language plpgsql security definer set search_path='' as $$
declare w nexora_food_private.deletion_work;begin
 select * into w from nexora_food_private.deletion_work where request_id=p_request for update;if not found or not w.database_done then raise exception 'Anonymization required first';end if;
 if p_stage='storage_done' then update nexora_food_private.deletion_work set storage_done=true where request_id=p_request;update public.nexora_food_deletion_requests set stage='auth_pending' where id=p_request;
 elsif p_stage='completed' then
 if not w.storage_done or exists(select 1 from auth.users where id=w.auth_target) then raise exception 'Storage and Auth removal required first';end if;
 update nexora_food_private.deletion_work set auth_done=true,auth_target=null,avatar_paths='{}',lease_until=null,last_error=null where request_id=p_request;
 update public.nexora_food_deletion_requests set status='completed',stage='completed',completed_at=now(),updated_at=now(),notes=null,blocker_code=null where id=p_request;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason) select p_request,'deletion-completed','food_deletion',p_request::text,'Food personal data removed; financial records anonymized' where not exists(select 1 from public.nexora_food_admin_audit_logs where entity_id=p_request::text and action='deletion-completed');
 elsif p_stage='retry' then update nexora_food_private.deletion_work set lease_until=null,next_attempt_at=now()+interval '10 minutes',last_error='external_cleanup_failed' where request_id=p_request;
 else raise exception 'Invalid cleanup stage';end if;
end$$;
create function nexora_food_private.set_retention_policy(p_days integer,p_text text,p_reason text) returns void language plpgsql security definer set search_path='' as $$begin
 if not nexora_food_private.nexora_is_super_admin() then raise exception 'Super Admin required';end if;
 if p_days is null or p_days not between 1 and 36500 or length(coalesce(trim(p_text),'')) not between 20 and 2000 or length(coalesce(trim(p_reason),''))<3 then raise exception 'Reviewed period, public explanation and audit reason required';end if;
 update public.nexora_food_app_settings set value=jsonb_build_object('reviewed',true,'financial_retention_days',p_days,'public_text',p_text),updated_by=auth.uid(),updated_at=now() where key='deletion.retention_policy';
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)values(auth.uid(),'retention-policy-reviewed','food_deletion','deletion.retention_policy',p_reason);
end$$;

create function public.nexora_food_deletion_status() returns jsonb language sql security invoker set search_path='' as $$select nexora_food_private.deletion_status()$$;
revoke all on function nexora_food_private.deletion_status(),public.nexora_food_deletion_status() from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.deletion_status(),public.nexora_food_deletion_status() to authenticated;

create function public.nexora_food_request_deletion(p_confirmation text) returns uuid language sql security invoker set search_path='' as $$select nexora_food_private.request_deletion(p_confirmation)$$;
revoke all on function nexora_food_private.request_deletion(text),public.nexora_food_request_deletion(text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.request_deletion(text),public.nexora_food_request_deletion(text) to authenticated;

create function public.nexora_food_cancel_deletion(p_request uuid) returns void language sql security invoker set search_path='' as $$select nexora_food_private.cancel_deletion(p_request)$$;
revoke all on function nexora_food_private.cancel_deletion(uuid),public.nexora_food_cancel_deletion(uuid) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.cancel_deletion(uuid),public.nexora_food_cancel_deletion(uuid) to authenticated;

create function public.nexora_food_prepare_deletion(p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select nexora_food_private.prepare_deletion(p_request)$$;
revoke all on function nexora_food_private.prepare_deletion(uuid),public.nexora_food_prepare_deletion(uuid) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.prepare_deletion(uuid),public.nexora_food_prepare_deletion(uuid) to service_role;

create function public.nexora_food_finish_deletion(p_request uuid,p_stage text) returns void language sql security invoker set search_path='' as $$select nexora_food_private.finish_deletion(p_request,p_stage)$$;
revoke all on function nexora_food_private.finish_deletion(uuid,text),public.nexora_food_finish_deletion(uuid,text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.finish_deletion(uuid,text),public.nexora_food_finish_deletion(uuid,text) to service_role;

create function public.nexora_food_set_retention_policy(p_days integer,p_text text,p_reason text) returns void language sql security invoker set search_path='' as $$select nexora_food_private.set_retention_policy(p_days,p_text,p_reason)$$;
revoke all on function nexora_food_private.set_retention_policy(integer,text,text),public.nexora_food_set_retention_policy(integer,text,text) from public,anon,authenticated,service_role;
grant execute on function nexora_food_private.set_retention_policy(integer,text,text),public.nexora_food_set_retention_policy(integer,text,text) to authenticated;

revoke all on function nexora_food_private.deletion_blockers(uuid),nexora_food_private.shared_account_linked(uuid),nexora_food_private.deletion_changed() from public,anon,authenticated;
notify pgrst,'reload schema';
