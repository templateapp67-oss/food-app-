alter table public.nexora_food_restaurants drop constraint nexora_food_restaurants_status_check;
alter table public.nexora_food_restaurants add constraint nexora_food_restaurants_status_check check(status in('pending','under_review','active','suspended','inactive','rejected'));
alter table public.nexora_food_restaurants add column rejection_reason text,add column decision_reason text,add column decided_at timestamptz;
-- The public invoker wrapper and existing admin-only RLS remain in place.
create or replace function nexora_food_private.nexora_food_admin_restaurant_status(p_restaurant uuid,p_status text,p_reason text)returns void language plpgsql security definer set search_path=''as $$
declare previous text;reason text:=trim(p_reason);
begin
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin access required';end if;
 if reason is null or length(reason)not between 3 and 2000 then raise exception 'Enter a reason between 3 and 2000 characters';end if;
 if p_status is null or p_status not in('pending','under_review','active','suspended','inactive','rejected')then raise exception 'Invalid restaurant status';end if;
 select status into previous from public.nexora_food_restaurants where id=p_restaurant for update;
 if not found then raise exception 'Restaurant not found';end if;
 if p_status='rejected'and previous not in('pending','under_review')then raise exception 'Only pending or under-review applications can be rejected';end if;
 update public.nexora_food_restaurants set status=p_status,rejection_reason=case when p_status='rejected'then reason else null end,decision_reason=reason,decided_at=now()where id=p_restaurant;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,before,after,reason)values(auth.uid(),'restaurant-status','restaurants',p_restaurant::text,jsonb_build_object('status',previous),jsonb_build_object('status',p_status),reason);
end$$;
