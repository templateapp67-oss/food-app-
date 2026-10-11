-- Food operations only. Existing orders/menu RPCs and customer checkout remain authoritative.
alter table public.nexora_food_delivery_partners add column is_online boolean not null default false;
alter table public.nexora_food_delivery_assignments add column dispatch_state text not null default 'requested' check(dispatch_state in('requested','accepted','reached_restaurant','picked_up','out_for_delivery','delivered','declined')),add column reached_at timestamptz,add column delivery_pay_paise bigint not null default 0 check(delivery_pay_paise>=0);
create table public.nexora_food_restaurant_documents(id uuid primary key default gen_random_uuid(),restaurant_id uuid not null references public.nexora_food_restaurants(id),kind text not null check(kind in('fssai','gst','identity','bank')),storage_path text not null unique,status text not null default 'pending' check(status in('pending','approved','rejected')),review_note text,uploaded_by uuid not null references auth.users(id),reviewed_by uuid,created_at timestamptz not null default now());
create table public.nexora_food_restaurant_earnings(order_id uuid primary key references public.nexora_food_orders(id),restaurant_id uuid not null references public.nexora_food_restaurants(id),gross_paise bigint not null check(gross_paise>=0),commission_bps integer not null check(commission_bps between 0 and 10000),commission_paise bigint not null check(commission_paise>=0),net_paise bigint not null check(net_paise>=0),state text not null default 'pending' check(state in('pending','earned','void')),settlement_id uuid references public.nexora_food_restaurant_settlements(id),earned_at timestamptz,created_at timestamptz not null default now(),check(net_paise=gross_paise-commission_paise));
create table public.nexora_food_rider_earnings(order_id uuid primary key references public.nexora_food_orders(id),partner_id uuid not null references public.nexora_food_delivery_partners(user_id),delivery_paise bigint not null check(delivery_paise>=0),tip_paise bigint not null check(tip_paise>=0),earned_at timestamptz not null default now());
create index food_documents_restaurant on public.nexora_food_restaurant_documents(restaurant_id,status);
create index food_restaurant_earnings_scope on public.nexora_food_restaurant_earnings(restaurant_id,earned_at);
create index food_earnings_settlement on public.nexora_food_restaurant_earnings(settlement_id);
create index food_rider_earnings_scope on public.nexora_food_rider_earnings(partner_id,earned_at);
create index food_orders_operations on public.nexora_food_orders(restaurant_id,status,created_at desc);
alter table public.nexora_food_restaurant_documents enable row level security;
alter table public.nexora_food_restaurant_earnings enable row level security;
alter table public.nexora_food_rider_earnings enable row level security;
revoke all on public.nexora_food_restaurant_documents,public.nexora_food_restaurant_earnings,public.nexora_food_rider_earnings from public,anon,authenticated;
grant select on public.nexora_food_restaurant_documents,public.nexora_food_restaurant_earnings,public.nexora_food_rider_earnings to authenticated;
grant all on public.nexora_food_restaurant_documents,public.nexora_food_restaurant_earnings,public.nexora_food_rider_earnings to service_role;
create policy food_documents_read on public.nexora_food_restaurant_documents for select to authenticated using(nexora_food_private.nexora_is_admin()or nexora_food_private.nexora_member(restaurant_id));
create policy food_restaurant_earnings_read on public.nexora_food_restaurant_earnings for select to authenticated using(nexora_food_private.nexora_is_admin()or nexora_food_private.nexora_member(restaurant_id));
create policy food_rider_earnings_read on public.nexora_food_rider_earnings for select to authenticated using(nexora_food_private.nexora_is_admin()or(partner_id=(select auth.uid())and exists(select 1 from public.nexora_food_profiles p where p.id=auth.uid()and not p.is_blocked)));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nexora-food-documents','nexora-food-documents',false,10485760,array['application/pdf','image/jpeg','image/png'])on conflict(id)do nothing;
create policy food_documents_storage_read on storage.objects for select to authenticated using(bucket_id='nexora-food-documents'and(nexora_food_private.nexora_is_admin()or nexora_food_private.image_member(name)));
create policy food_documents_storage_insert on storage.objects for insert to authenticated with check(bucket_id='nexora-food-documents'and nexora_food_private.image_member(name));
create policy food_documents_storage_delete on storage.objects for delete to authenticated using(bucket_id='nexora-food-documents'and nexora_food_private.image_member(name)and not exists(select 1 from public.nexora_food_restaurant_documents d where d.storage_path=name));
insert into public.nexora_food_app_settings(key,value)values('rider.delivery_pay_paise','0')on conflict do nothing;

create function nexora_food_private.operations_earnings() returns trigger language plpgsql security definer set search_path=public as $$
declare gross bigint;bps integer;fee bigint;begin
 if TG_OP='INSERT' then
 gross:=new.items_subtotal_paise-new.discount_coupon_paise-new.discount_loyalty_paise;
 select commission_bps into bps from public.nexora_food_restaurants where id=new.restaurant_id;fee:=floor(gross::numeric*bps/10000);
 insert into public.nexora_food_restaurant_earnings(order_id,restaurant_id,gross_paise,commission_bps,commission_paise,net_paise)values(new.id,new.restaurant_id,gross,bps,fee,gross-fee)on conflict do nothing;
 elsif new.status='delivered'and old.status is distinct from new.status then
 update public.nexora_food_restaurant_earnings set state='earned',earned_at=new.delivered_at where order_id=new.id;
 update public.nexora_food_delivery_assignments set dispatch_state='delivered'where order_id=new.id;
 insert into public.nexora_food_rider_earnings(order_id,partner_id,delivery_paise,tip_paise)select new.id,partner_id,delivery_pay_paise,new.tip_paise from public.nexora_food_delivery_assignments where order_id=new.id on conflict do nothing;
 elsif new.status in('cancelled','rejected') then
 update public.nexora_food_restaurant_earnings set state='void'where order_id=new.id and state='pending';
 update public.nexora_food_delivery_assignments set status='failed'where order_id=new.id and status<>'delivered';
 end if;return new;end$$;
revoke all on function nexora_food_private.operations_earnings()from public,anon,authenticated;
create trigger food_operations_earnings after insert or update of status on public.nexora_food_orders for each row execute function nexora_food_private.operations_earnings();

create function nexora_food_private.food_ops_action(p_action text,p_data jsonb)returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();rid uuid;oid uuid;partner uuid;order_row public.nexora_food_orders;assignment public.nexora_food_delivery_assignments;stage text;reason text:=trim(coalesce(p_data->>'reason',''));sid uuid;g bigint;c bigint;n bigint;begin
 if uid is null or not exists(select 1 from public.nexora_food_profiles where id=uid and not is_blocked)then raise exception 'Sign in required';end if;
 if p_action='kitchen' then
 rid:=(p_data->>'restaurant_id')::uuid;if not(nexora_food_private.nexora_member(rid)or nexora_food_private.nexora_is_admin())then raise exception 'Restaurant access required';end if;
 update public.nexora_food_restaurants set prep_time_min=(p_data->>'minutes')::integer,is_temporarily_closed=(p_data->>'paused')::boolean where id=rid;if not found then raise exception 'Restaurant not found';end if;
 elsif p_action='rider_online' then
 update public.nexora_food_delivery_partners set is_online=(p_data->>'online')::boolean where user_id=uid and is_active and exists(select 1 from public.nexora_food_user_roles where user_id=uid and role='rider');if not found then raise exception 'Active rider required';end if;
 elsif p_action='dispatch' then
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;if length(reason)<3 then raise exception 'Reason required';end if;
 oid:=(p_data->>'order_id')::uuid;partner:=(p_data->>'partner_id')::uuid;
 select *into order_row from public.nexora_food_orders where id=oid for update;if not found or order_row.status not in('confirmed','preparing','ready_for_pickup')then raise exception 'Order is not dispatchable';end if;
 perform 1 from public.nexora_food_delivery_partners r join public.nexora_food_profiles p on p.id=r.user_id where r.user_id=partner and r.is_active and r.is_online and not p.is_blocked and exists(select 1 from public.nexora_food_user_roles where user_id=partner and role='rider')for update of r;if not found then raise exception 'Online active rider required';end if;
 if exists(select 1 from public.nexora_food_delivery_assignments where partner_id=partner and status='assigned'and dispatch_state<>'declined'and order_id<>oid)or exists(select 1 from public.nexora_food_delivery_assignments where partner_id=partner and status='picked_up')then raise exception 'Rider already has a delivery';end if;
 if exists(select 1 from public.nexora_food_delivery_assignments where order_id=oid and(dispatch_state in('picked_up','out_for_delivery','delivered')or status in('picked_up','delivered')))then raise exception 'Delivery already picked up';end if;
 insert into public.nexora_food_delivery_assignments(order_id,partner_id,assigned_by,delivery_pay_paise)values(oid,partner,uid,coalesce((nexora_food_private.nexora_setting('rider.delivery_pay_paise')#>>'{}')::bigint,0))on conflict(order_id)do update set partner_id=excluded.partner_id,assigned_by=uid,status='assigned',dispatch_state='requested',assigned_at=now(),reached_at=null,picked_up_at=null,delivery_pay_paise=excluded.delivery_pay_paise;
 elsif p_action='rider_stage' then
 oid:=(p_data->>'order_id')::uuid;stage:=p_data->>'stage';select *into order_row from public.nexora_food_orders where id=oid for update;
 if not found or not nexora_food_private.active_rider(oid)then raise exception 'Assigned active rider required';end if;
 select *into assignment from public.nexora_food_delivery_assignments where order_id=oid for update;
 if order_row.status in('cancelled','rejected','delivered')then raise exception 'Order already closed';end if;
 if stage=assignment.dispatch_state then return;end if;
 if not((assignment.dispatch_state='requested'and stage in('accepted','declined'))or(assignment.dispatch_state='accepted'and stage='reached_restaurant')or(assignment.dispatch_state='reached_restaurant'and stage='picked_up'and order_row.status='ready_for_pickup')or(assignment.dispatch_state='picked_up'and stage='out_for_delivery')or(assignment.dispatch_state='out_for_delivery'and stage='delivered'))then raise exception 'Invalid delivery stage or kitchen is not ready';end if;
 if stage='out_for_delivery'then perform nexora_food_private.nexora_food_transition_order(oid,'out_for_delivery',null);elsif stage='delivered'then perform nexora_food_private.nexora_food_transition_order(oid,'delivered',null);end if;
 update public.nexora_food_delivery_assignments set dispatch_state=stage,status=case when stage='declined'then 'failed' when stage='delivered'then 'delivered'when stage in('picked_up','out_for_delivery')then 'picked_up'else status end,reached_at=case when stage='reached_restaurant'then now()else reached_at end,picked_up_at=case when stage='picked_up'then now()else picked_up_at end where order_id=oid;
 elsif p_action='document_submit' then
 rid:=(p_data->>'restaurant_id')::uuid;if not nexora_food_private.nexora_member(rid)then raise exception 'Restaurant access required';end if;
 if split_part(p_data->>'path','/',1)<>rid::text or not exists(select 1 from storage.objects where bucket_id='nexora-food-documents'and name=p_data->>'path')then raise exception 'Upload document first';end if;
 insert into public.nexora_food_restaurant_documents(restaurant_id,kind,storage_path,uploaded_by)values(rid,p_data->>'kind',p_data->>'path',uid);
 elsif p_action='document_review' then
 if not nexora_food_private.nexora_is_admin()or length(reason)<3 then raise exception 'Admin and review reason required';end if;
 if p_data->>'status'not in('approved','rejected')then raise exception 'Invalid review status';end if;
 update public.nexora_food_restaurant_documents set status=p_data->>'status',review_note=reason,reviewed_by=uid where id=(p_data->>'id')::uuid;if not found then raise exception 'Document not found';end if;
 elsif p_action='commission' then
 if not nexora_food_private.nexora_is_super_admin()or length(reason)<3 then raise exception 'Super Admin and reason required';end if;
 update public.nexora_food_restaurants set commission_bps=(p_data->>'bps')::integer where id=(p_data->>'restaurant_id')::uuid;if not found then raise exception 'Restaurant not found';end if;
 elsif p_action='rider_pay' then
 if not nexora_food_private.nexora_is_super_admin()or length(reason)<3 then raise exception 'Super Admin and reason required';end if;
 if (p_data->>'paise')::bigint not between 0 and 100000 then raise exception 'Invalid delivery pay';end if;
 update public.nexora_food_app_settings set value=to_jsonb((p_data->>'paise')::bigint),updated_by=uid,updated_at=now()where key='rider.delivery_pay_paise';
 elsif p_action='coupon_toggle' then
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;update public.nexora_food_coupons set is_active=(p_data->>'active')::boolean where id=(p_data->>'id')::uuid;
 elsif p_action='settlement_create' then
 if not nexora_food_private.nexora_is_admin()or length(reason)<3 then raise exception 'Admin and reason required';end if;rid:=(p_data->>'restaurant_id')::uuid;
 perform 1 from public.nexora_food_restaurants where id=rid for update;
 select sum(gross_paise),sum(commission_paise),sum(net_paise)into g,c,n from public.nexora_food_restaurant_earnings where restaurant_id=rid and state='earned'and settlement_id is null;
 if g is null then raise exception 'No unsettled earnings';end if;
 insert into public.nexora_food_restaurant_settlements(restaurant_id,period_start,period_end,gross_paise,commission_paise,tax_on_commission_paise,refunds_paise,net_payable_paise)select rid,min((earned_at at time zone 'Asia/Kolkata')::date),max((earned_at at time zone 'Asia/Kolkata')::date),g,c,0,0,n from public.nexora_food_restaurant_earnings where restaurant_id=rid and state='earned'and settlement_id is null returning id into sid;
 update public.nexora_food_restaurant_earnings set settlement_id=sid where restaurant_id=rid and state='earned'and settlement_id is null;
 elsif p_action='settlement_status' then
 if not nexora_food_private.nexora_is_admin()or length(reason)<3 then raise exception 'Admin and payout reference required';end if;
 update public.nexora_food_restaurant_settlements set status=p_data->>'status',paid_ref=case when p_data->>'status'='paid'then reason else paid_ref end where id=(p_data->>'id')::uuid and((status='draft'and p_data->>'status'='approved')or(status='approved'and p_data->>'status'='paid'));if not found then raise exception 'Invalid settlement transition';end if;
 else raise exception 'Unknown operation';end if;
 if nexora_food_private.nexora_is_admin()then insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(uid,p_action,'food_operations',coalesce(p_data->>'order_id',p_data->>'restaurant_id',p_data->>'id'),p_data,coalesce(nullif(reason,''),'Dashboard operation'));end if;
end$$;
revoke all on function nexora_food_private.food_ops_action(text,jsonb)from public,anon;
grant execute on function nexora_food_private.food_ops_action(text,jsonb)to authenticated;
create function public.nexora_food_operations_action(p_action text,p_data jsonb)returns void language sql security invoker set search_path=''as $$select nexora_food_private.food_ops_action(p_action,p_data)$$;
revoke all on function public.nexora_food_operations_action(text,jsonb)from public,anon;
grant execute on function public.nexora_food_operations_action(text,jsonb)to authenticated;

create function nexora_food_private.food_ops_snapshot(p_role text,p_restaurant uuid default null)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare admin boolean:=nexora_food_private.nexora_is_admin();uid uuid:=auth.uid();result jsonb;begin
 if uid is null or not exists(select 1 from public.nexora_food_profiles where id=uid and not is_blocked)then raise exception 'Sign in required';end if;
 if(p_role='admin'and not admin)or(p_role='restaurant'and not(admin or nexora_food_private.nexora_member(p_restaurant)))or(p_role='rider'and not exists(select 1 from public.nexora_food_delivery_partners r join public.nexora_food_user_roles u on u.user_id=r.user_id where r.user_id=uid and r.is_active and u.role='rider'))or p_role not in('admin','restaurant','rider')then raise exception 'Workspace access required';end if;
 select jsonb_build_object('metrics',jsonb_build_object('orders',count(*),'gmv',coalesce(sum(total_paise)filter(where status not in('cancelled','rejected','pending_payment')),0),'active',count(*)filter(where status in('placed','confirmed','preparing','ready_for_pickup','out_for_delivery'))),'orders',coalesce((select jsonb_agg(to_jsonb(x))from(select o.*,(select jsonb_agg(i)from public.nexora_food_order_items i where i.order_id=o.id)order_items from public.nexora_food_orders o where(p_role='admin'or(p_role='restaurant'and o.restaurant_id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=o.id and a.partner_id=uid)))order by o.created_at desc limit 200)x),'[]'))into result from public.nexora_food_orders o where p_role='admin'or(p_role='restaurant'and o.restaurant_id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=o.id and a.partner_id=uid));
 return result||jsonb_build_object(
 'restaurants',coalesce((select jsonb_agg(to_jsonb(r)-'location')from public.nexora_food_restaurants r where p_role='admin'or(p_role='restaurant'and r.id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_orders o join public.nexora_food_delivery_assignments a on a.order_id=o.id where o.restaurant_id=r.id and a.partner_id=uid))),'[]'),
 'riders',coalesce((select jsonb_agg(r)from public.nexora_food_delivery_partners r where p_role='admin'or(p_role='rider'and r.user_id=uid)),'[]'),
 'assignments',coalesce((select jsonb_agg(a)from public.nexora_food_delivery_assignments a where p_role='admin'or(p_role='rider'and a.partner_id=uid)or(p_role='restaurant'and exists(select 1 from public.nexora_food_orders o where o.id=a.order_id and o.restaurant_id=p_restaurant))),'[]'),
 'documents',coalesce((select jsonb_agg(d)from public.nexora_food_restaurant_documents d where p_role='admin'or(p_role='restaurant'and d.restaurant_id=p_restaurant)),'[]'),
 'restaurantLedger',coalesce((select jsonb_agg(e)from public.nexora_food_restaurant_earnings e where p_role='admin'or(p_role='restaurant'and e.restaurant_id=p_restaurant)),'[]'),
 'riderLedger',coalesce((select jsonb_agg(e)from public.nexora_food_rider_earnings e where p_role='admin'or(p_role='rider'and e.partner_id=uid)),'[]'),
 'settlements',coalesce((select jsonb_agg(s)from public.nexora_food_restaurant_settlements s where p_role='admin'or(p_role='restaurant'and s.restaurant_id=p_restaurant)),'[]'),
 'settings',case when p_role='admin'then(select jsonb_object_agg(key,value)from public.nexora_food_app_settings)else '{}'::jsonb end,
 'coupons',case when p_role='admin'then coalesce((select jsonb_agg(c)from public.nexora_food_coupons c),'[]')else '[]'::jsonb end);
end$$;
revoke all on function nexora_food_private.food_ops_snapshot(text,uuid)from public,anon;
grant execute on function nexora_food_private.food_ops_snapshot(text,uuid)to authenticated;
create function public.nexora_food_operations_snapshot(p_role text,p_restaurant uuid default null)returns jsonb language sql stable security invoker set search_path=''as $$select nexora_food_private.food_ops_snapshot(p_role,p_restaurant)$$;
revoke all on function public.nexora_food_operations_snapshot(text,uuid)from public,anon;
grant execute on function public.nexora_food_operations_snapshot(text,uuid)to authenticated;
-- Add only Food tables; never recreate a shared publication.
do $$declare t text;begin foreach t in array array['nexora_food_orders','nexora_food_delivery_assignments','nexora_food_delivery_partners','nexora_food_restaurant_documents','nexora_food_restaurant_earnings','nexora_food_rider_earnings','nexora_food_restaurant_settlements','nexora_food_menu_items','nexora_food_restaurants','nexora_food_coupons','nexora_food_app_settings']loop if exists(select 1 from pg_publication where pubname='supabase_realtime')and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'and schemaname='public'and tablename=t)then execute format('alter publication supabase_realtime add table public.%I',t);end if;end loop;end$$;
notify pgrst,'reload schema';
