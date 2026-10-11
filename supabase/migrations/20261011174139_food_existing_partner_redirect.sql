-- Existing restaurant role holders should return to kitchen onboarding even before membership.
create or replace function nexora_food_private.workspace_context(p_workspace text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); desired text; chosen text; ready boolean:=false; application boolean:=false;
begin
 if uid is null then raise exception 'Sign in required';end if;
 perform public.nexora_food_ensure_account();
 if exists(select 1 from public.nexora_food_profiles where id=uid and is_blocked)then raise exception 'Account blocked';end if;
 if p_workspace is not null and p_workspace not in('customer','restaurant','rider','admin')then raise exception 'Invalid workspace';end if;
 select registration_workspace into desired from public.nexora_food_profiles where id=uid for update;
 if p_workspace is not null then desired:=p_workspace;
 elsif desired is null then
  -- User-editable metadata records signup intent ONLY; it never grants admin/rider permissions.
  select raw_user_meta_data->>'registration_workspace' into desired from auth.users where id=uid;
  if desired is null or desired not in('customer','restaurant','rider','admin')then desired:='customer';end if;
 end if;
 update public.nexora_food_profiles set registration_workspace=desired where id=uid and registration_workspace is distinct from desired;
 if desired='restaurant' then insert into public.nexora_food_user_roles(user_id,role)values(uid,'restaurant_owner')on conflict do nothing;end if;
 chosen:=desired;
 if p_workspace is null then
  if nexora_food_private.nexora_is_admin()then chosen:='admin';
  elsif exists(select 1 from public.nexora_food_user_roles where user_id=uid and role='rider')then chosen:='rider';
  elsif exists(select 1 from public.nexora_food_restaurant_members where user_id=uid)or exists(select 1 from public.nexora_food_user_roles where user_id=uid and role in('restaurant_owner','restaurant_staff'))then chosen:='restaurant';end if;
 end if;
 if chosen='customer'then ready:=true;
 elsif chosen='admin'then ready:=nexora_food_private.nexora_is_admin();
 elsif chosen='restaurant'then ready:=exists(select 1 from public.nexora_food_restaurant_members where user_id=uid)or nexora_food_private.nexora_is_admin();
 else
  ready:=exists(select 1 from public.nexora_food_delivery_partners d join public.nexora_food_user_roles r on r.user_id=d.user_id where d.user_id=uid and d.is_active and r.role='rider');
  application:=exists(select 1 from public.nexora_food_delivery_partners where user_id=uid);
 end if;
 return jsonb_build_object('workspace',chosen,'ready',ready,'application_submitted',application,'path',case chosen when 'admin'then '/admin' when 'restaurant'then '/restaurant' when 'rider'then '/rider' else '/' end);
end$$;
