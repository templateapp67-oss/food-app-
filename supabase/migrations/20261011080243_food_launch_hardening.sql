-- Public config reads only explicitly public settings without bypassing RLS.
alter function public.nexora_food_public_config() security invoker;
grant select on public.nexora_food_app_settings to anon;
create policy food_public_settings on public.nexora_food_app_settings for select to anon,authenticated using(key in('cod.enabled','payments.online_enabled','loyalty.earn_per_paise','loyalty.redeem_paise_per_100_points'));
grant usage on schema nexora_food_private to service_role;
-- Put privilege-bearing implementations behind a private-schema boundary.
-- Public RPC wrappers keep exactly the previous permission set and signed arguments.
do $$declare f record;args text;result_type text;call_args text;allow_anon boolean;allow_auth boolean;allow_service boolean;begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname like 'nexora_food_%'and p.prosecdef loop
  args:=pg_get_function_arguments(f.oid);result_type:=pg_get_function_result(f.oid);
  select coalesce(string_agg(quote_ident(a),' , '),'')into call_args from pg_proc p left join lateral unnest(p.proargnames)a on true where p.oid=f.oid;
  allow_anon:=has_function_privilege('anon',f.oid,'execute');allow_auth:=has_function_privilege('authenticated',f.oid,'execute');allow_service:=has_function_privilege('service_role',f.oid,'execute');
  execute format('alter function %s set schema nexora_food_private',f.oid::regprocedure);
  execute format('create function public.%I(%s)returns %s language sql security invoker set search_path=public as $body$select nexora_food_private.%I(%s)$body$',f.proname,args,result_type,f.proname,call_args);
  execute format('revoke all on function public.%I(%s)from public,anon,authenticated,service_role',f.proname,pg_get_function_identity_arguments(f.oid));
  if allow_anon then execute format('grant execute on function public.%I(%s)to anon',f.proname,pg_get_function_identity_arguments(f.oid));end if;
  if allow_auth then execute format('grant execute on function public.%I(%s)to authenticated',f.proname,pg_get_function_identity_arguments(f.oid));end if;
  if allow_service then execute format('grant execute on function public.%I(%s)to service_role',f.proname,pg_get_function_identity_arguments(f.oid));end if;
 end loop;
end$$;
-- Explicit deny policies document service/internal-only tables.
do $$declare t record;begin for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r'and((n.nspname='public'and c.relname like 'nexora_food_%')or n.nspname='nexora_food_private')and not exists(select 1 from pg_policy p where p.polrelid=c.oid)loop execute format('create policy food_internal_only on %I.%I for all to anon,authenticated using(false)with check(false)',t.nspname,t.relname);end loop;end$$;
-- Keep assignment progress synchronized with authoritative order transitions.
create function nexora_food_private.sync_delivery_status()returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.status='out_for_delivery'then update public.nexora_food_delivery_assignments set status='picked_up',picked_up_at=coalesce(picked_up_at,now())where order_id=new.id;
 elsif new.status='delivered'then update public.nexora_food_delivery_assignments set status='delivered',delivered_at=coalesce(delivered_at,now())where order_id=new.id;end if;return new;
end$$;
revoke all on function nexora_food_private.sync_delivery_status()from public,anon,authenticated;
create trigger nexora_food_sync_delivery after update of status on public.nexora_food_orders for each row execute function nexora_food_private.sync_delivery_status();
