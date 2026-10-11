-- Registration intent is separate from privileged authorization in user_roles.
alter table public.nexora_food_profiles add column registration_workspace text check(registration_workspace in('customer','restaurant','rider','admin'));
create function nexora_food_private.workspace_context(p_workspace text default null) returns jsonb language plpgsql security definer set search_path='' as $$
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
  elsif exists(select 1 from public.nexora_food_restaurant_members where user_id=uid)then chosen:='restaurant';end if;
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
create function public.nexora_food_workspace_context(p_workspace text default null)returns jsonb language sql security invoker set search_path=''as $$select nexora_food_private.workspace_context(p_workspace)$$;
revoke all on function nexora_food_private.workspace_context(text),public.nexora_food_workspace_context(text)from public,anon;
grant execute on function nexora_food_private.workspace_context(text),public.nexora_food_workspace_context(text)to authenticated;

create function nexora_food_private.workspace_requests()returns jsonb language plpgsql stable security definer set search_path=''as $$
begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'email',p.email,'workspace',p.registration_workspace,'application_submitted',exists(select 1 from public.nexora_food_delivery_partners d where d.user_id=p.id)) order by p.created_at desc)from public.nexora_food_profiles p where not p.is_blocked and p.registration_workspace in('admin','rider')and not exists(select 1 from public.nexora_food_user_roles r where r.user_id=p.id and r.role::text=case p.registration_workspace when 'admin'then 'super_admin' else 'rider' end)), '[]'::jsonb);
end$$;
create function public.nexora_food_workspace_requests()returns jsonb language sql stable security invoker set search_path=''as $$select nexora_food_private.workspace_requests()$$;
revoke all on function nexora_food_private.workspace_requests(),public.nexora_food_workspace_requests()from public,anon;
grant execute on function nexora_food_private.workspace_requests(),public.nexora_food_workspace_requests()to authenticated;

create function nexora_food_private.approve_workspace(p_user uuid,p_reason text)returns void language plpgsql security definer set search_path=''as $$
declare desired text;
begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;
 select registration_workspace into desired from public.nexora_food_profiles where id=p_user and not is_blocked for update;
 if desired is null or desired not in('admin','rider')then raise exception 'Pending role request required';end if;
 if desired='rider'and not exists(select 1 from public.nexora_food_delivery_partners where user_id=p_user and length(coalesce(phone,''))>=10)then raise exception 'Complete rider application first';end if;
 perform public.nexora_food_admin_role(p_user,case desired when 'admin'then 'super_admin'else 'rider'end,p_reason);
end$$;
create function public.nexora_food_approve_workspace(p_user uuid,p_reason text)returns void language sql security invoker set search_path=''as $$select nexora_food_private.approve_workspace(p_user,p_reason)$$;
revoke all on function nexora_food_private.approve_workspace(uuid,text),public.nexora_food_approve_workspace(uuid,text)from public,anon;
grant execute on function nexora_food_private.approve_workspace(uuid,text),public.nexora_food_approve_workspace(uuid,text)to authenticated;
