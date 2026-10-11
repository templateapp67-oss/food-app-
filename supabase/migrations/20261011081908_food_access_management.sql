-- Food roles remain independent of existing platform roles.
create or replace function nexora_food_private.nexora_is_admin()returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_user_roles r join public.nexora_food_profiles p on p.id=r.user_id where r.user_id=auth.uid()and r.role in('admin','super_admin')and not p.is_blocked)$$;
create or replace function nexora_food_private.nexora_is_super_admin()returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_user_roles r join public.nexora_food_profiles p on p.id=r.user_id where r.user_id=auth.uid()and r.role='super_admin'and not p.is_blocked)$$;
create or replace function nexora_food_private.nexora_member(r uuid)returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_restaurant_members m join public.nexora_food_profiles p on p.id=m.user_id where m.user_id=auth.uid()and m.restaurant_id=r and not p.is_blocked)$$;
create function nexora_food_private.active_rider(p_order uuid)returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.nexora_food_delivery_assignments a join public.nexora_food_delivery_partners r on r.user_id=a.partner_id join public.nexora_food_profiles p on p.id=r.user_id where a.order_id=p_order and a.partner_id=auth.uid()and r.is_active and not p.is_blocked)$$;
revoke all on function nexora_food_private.active_rider(uuid)from public,anon;grant execute on function nexora_food_private.active_rider(uuid)to authenticated,service_role;
alter policy orders_authorized_read on public.nexora_food_orders using(user_id=auth.uid()or nexora_food_private.nexora_member(restaurant_id)or nexora_food_private.nexora_is_admin()or nexora_food_private.active_rider(id));
alter policy assignments_read on public.nexora_food_delivery_assignments using(nexora_food_private.active_rider(order_id)or nexora_food_private.nexora_is_admin());
create function nexora_food_private.nexora_food_admin_access(p_user uuid,p_role text,p_action text,p_restaurant uuid,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;
 if length(trim(coalesce(p_reason,'')))<3 or p_action not in('revoke','block','unblock')then raise exception 'Valid action and reason required';end if;
 perform pg_advisory_xact_lock(hashtextextended('nexora-food-super-admin-management',0));
 if p_action='block'or(p_action='revoke'and p_role='super_admin')then
  if exists(select 1 from public.nexora_food_user_roles where user_id=p_user and role='super_admin')and not exists(select 1 from public.nexora_food_user_roles r join public.nexora_food_profiles p on p.id=r.user_id where r.role='super_admin'and r.user_id<>p_user and not p.is_blocked)then raise exception 'Keep at least one active Super Admin';end if;
 end if;
 if p_action in('block','unblock')then update public.nexora_food_profiles set is_blocked=(p_action='block')where id=p_user;if not found then raise exception 'Account not found';end if;
 elsif p_restaurant is not null then delete from public.nexora_food_restaurant_members where restaurant_id=p_restaurant and user_id=p_user;
 else
  if p_role in('restaurant_owner','restaurant_staff')and exists(select 1 from public.nexora_food_restaurant_members where user_id=p_user)then raise exception 'Revoke restaurant memberships first';end if;
  if p_role is null or p_role='customer'then raise exception 'Customer role cannot be revoked; block the Food account instead';end if;
  delete from public.nexora_food_user_roles where user_id=p_user and role=p_role::public.nexora_food_app_role;
  if p_role='rider'then update public.nexora_food_delivery_partners set is_active=false where user_id=p_user;end if;
 end if;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),p_action,'food_access',p_user::text,jsonb_build_object('role',p_role,'restaurant',p_restaurant),p_reason);
end$$;
revoke all on function nexora_food_private.nexora_food_admin_access(uuid,text,text,uuid,text)from public,anon;
grant execute on function nexora_food_private.nexora_food_admin_access(uuid,text,text,uuid,text)to authenticated,service_role;
create function public.nexora_food_admin_access(p_user uuid,p_role text,p_action text,p_restaurant uuid,p_reason text)returns void language sql security invoker set search_path=public as $$select nexora_food_private.nexora_food_admin_access(p_user,p_role,p_action,p_restaurant,p_reason)$$;
revoke all on function public.nexora_food_admin_access(uuid,text,text,uuid,text)from public,anon;
grant execute on function public.nexora_food_admin_access(uuid,text,text,uuid,text)to authenticated,service_role;
-- Deny operational transitions and location writes by blocked or deactivated accounts.
do $$declare def text;begin
 select pg_get_functiondef('nexora_food_private.nexora_food_transition_order(uuid,text,text)'::regprocedure)into def;
 def:=replace(def,'rider:=exists(select 1 from public.nexora_food_delivery_assignments where order_id=o.id and partner_id=auth.uid());','rider:=nexora_food_private.active_rider(o.id);');
 def:=replace(def,'select * into o from public.nexora_food_orders where id=p_order for update;','if exists(select 1 from public.nexora_food_profiles where id=auth.uid()and is_blocked)then raise exception ''Account blocked'';end if;select * into o from public.nexora_food_orders where id=p_order for update;');execute def;
 select pg_get_functiondef('nexora_food_private.nexora_food_rider_location(uuid,numeric,numeric)'::regprocedure)into def;
 def:=replace(def,'not exists(select 1 from public.nexora_food_delivery_assignments where order_id=p_order and partner_id=auth.uid())','not nexora_food_private.active_rider(p_order)');execute def;
end$$;
