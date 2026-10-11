-- Lock settlement batches to exact eligible orders and close declined rider access.
create or replace function nexora_food_private.food_ops_action(p_action text,p_data jsonb)returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();rid uuid;oid uuid;partner uuid;order_row public.nexora_food_orders;assignment public.nexora_food_delivery_assignments;stage text;reason text:=trim(coalesce(p_data->>'reason',''));sid uuid;eligible uuid[];g bigint;c bigint;n bigint;begin
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
 if stage=assignment.dispatch_state then return;end if;
 if order_row.status in('cancelled','rejected','delivered')then raise exception 'Order already closed';end if;
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
 elsif p_action='verify_restaurant' then
 if not nexora_food_private.nexora_is_admin()or length(reason)<3 then raise exception 'Admin and verification reason required';end if;rid:=(p_data->>'restaurant_id')::uuid;
 if p_data->>'status'not in('active','inactive')then raise exception 'Invalid verification status';end if;
 if p_data->>'status'='active'and not exists(select 1 from public.nexora_food_restaurant_documents where restaurant_id=rid and kind='fssai'and status='approved')then raise exception 'Approve the restaurant FSSAI document first';end if;
 perform nexora_food_private.nexora_food_admin_restaurant_status(rid,p_data->>'status',reason);
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
 select array_agg(order_id)into eligible from(select order_id from public.nexora_food_restaurant_earnings where restaurant_id=rid and state='earned'and settlement_id is null for update)x;
 select sum(gross_paise),sum(commission_paise),sum(net_paise)into g,c,n from public.nexora_food_restaurant_earnings where order_id=any(eligible);
 if g is null then raise exception 'No unsettled earnings';end if;
 insert into public.nexora_food_restaurant_settlements(restaurant_id,period_start,period_end,gross_paise,commission_paise,tax_on_commission_paise,refunds_paise,net_payable_paise)select rid,min((earned_at at time zone 'Asia/Kolkata')::date),max((earned_at at time zone 'Asia/Kolkata')::date),g,c,0,0,n from public.nexora_food_restaurant_earnings where order_id=any(eligible) returning id into sid;
 update public.nexora_food_restaurant_earnings set settlement_id=sid where order_id=any(eligible);
 elsif p_action='settlement_status' then
 if not nexora_food_private.nexora_is_admin()or length(reason)<3 then raise exception 'Admin and payout reference required';end if;
 update public.nexora_food_restaurant_settlements set status=p_data->>'status',paid_ref=case when p_data->>'status'='paid'then reason else paid_ref end where id=(p_data->>'id')::uuid and((status='draft'and p_data->>'status'='approved')or(status='approved'and p_data->>'status'='paid'));if not found then raise exception 'Invalid settlement transition';end if;
 else raise exception 'Unknown operation';end if;
 if nexora_food_private.nexora_is_admin()then insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(uid,p_action,'food_operations',coalesce(p_data->>'order_id',p_data->>'restaurant_id',p_data->>'id'),p_data,coalesce(nullif(reason,''),'Dashboard operation'));end if;
end$$;

create or replace function nexora_food_private.food_ops_snapshot(p_role text,p_restaurant uuid default null)returns jsonb language plpgsql stable security definer set search_path=public as $$
declare admin boolean:=nexora_food_private.nexora_is_admin();uid uuid:=auth.uid();result jsonb;begin
 if uid is null or not exists(select 1 from public.nexora_food_profiles where id=uid and not is_blocked)then raise exception 'Sign in required';end if;
 if(p_role='admin'and not admin)or(p_role='restaurant'and not(admin or nexora_food_private.nexora_member(p_restaurant)))or(p_role='rider'and not exists(select 1 from public.nexora_food_delivery_partners r join public.nexora_food_user_roles u on u.user_id=r.user_id where r.user_id=uid and r.is_active and u.role='rider'))or p_role is null or p_role not in('admin','restaurant','rider')then raise exception 'Workspace access required';end if;
 select jsonb_build_object('metrics',jsonb_build_object('orders',count(*),'gmv',coalesce(sum(total_paise)filter(where status not in('cancelled','rejected','pending_payment')),0),'active',count(*)filter(where status in('placed','confirmed','preparing','ready_for_pickup','out_for_delivery'))),'orders',coalesce((select jsonb_agg(to_jsonb(x))from(select o.*,(select jsonb_agg(i)from public.nexora_food_order_items i where i.order_id=o.id)order_items from public.nexora_food_orders o where(p_role='admin'or(p_role='restaurant'and o.restaurant_id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=o.id and a.partner_id=uid and a.dispatch_state<>'declined'and a.status<>'failed')))order by o.created_at desc limit 200)x),'[]'))into result from public.nexora_food_orders o where p_role='admin'or(p_role='restaurant'and o.restaurant_id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_delivery_assignments a where a.order_id=o.id and a.partner_id=uid and a.dispatch_state<>'declined'and a.status<>'failed'));
 return result||jsonb_build_object(
 'restaurants',coalesce((select jsonb_agg(to_jsonb(r)-'location')from public.nexora_food_restaurants r where p_role='admin'or(p_role='restaurant'and r.id=p_restaurant)or(p_role='rider'and exists(select 1 from public.nexora_food_orders o join public.nexora_food_delivery_assignments a on a.order_id=o.id where o.restaurant_id=r.id and a.partner_id=uid and a.dispatch_state<>'declined'and a.status<>'failed'))),'[]'),
 'riders',coalesce((select jsonb_agg(r)from public.nexora_food_delivery_partners r where p_role='admin'or(p_role='rider'and r.user_id=uid)),'[]'),
 'assignments',coalesce((select jsonb_agg(a)from public.nexora_food_delivery_assignments a where p_role='admin'or(p_role='rider'and a.partner_id=uid and a.dispatch_state<>'declined'and a.status<>'failed')or(p_role='restaurant'and exists(select 1 from public.nexora_food_orders o where o.id=a.order_id and o.restaurant_id=p_restaurant))),'[]'),
 'documents',coalesce((select jsonb_agg(d)from public.nexora_food_restaurant_documents d where p_role='admin'or(p_role='restaurant'and d.restaurant_id=p_restaurant)),'[]'),
 'restaurantLedger',coalesce((select jsonb_agg(e)from public.nexora_food_restaurant_earnings e where p_role='admin'or(p_role='restaurant'and e.restaurant_id=p_restaurant)),'[]'),
 'riderLedger',coalesce((select jsonb_agg(e)from public.nexora_food_rider_earnings e where p_role='admin'or(p_role='rider'and e.partner_id=uid)),'[]'),
 'settlements',coalesce((select jsonb_agg(s)from public.nexora_food_restaurant_settlements s where p_role='admin'or(p_role='restaurant'and s.restaurant_id=p_restaurant)),'[]'),
 'settings',case when p_role='admin'then(select jsonb_object_agg(key,value)from public.nexora_food_app_settings)else '{}'::jsonb end,
 'coupons',case when p_role='admin'then coalesce((select jsonb_agg(c)from public.nexora_food_coupons c),'[]')else '[]'::jsonb end);
end$$;

create or replace function nexora_food_private.active_rider(p_order uuid)returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_delivery_assignments a join public.nexora_food_delivery_partners r on r.user_id=a.partner_id join public.nexora_food_profiles p on p.id=r.user_id where a.order_id=p_order and a.partner_id=auth.uid()and r.is_active and not p.is_blocked and a.status<>'failed'and a.dispatch_state<>'declined')$$;
notify pgrst,'reload schema';
