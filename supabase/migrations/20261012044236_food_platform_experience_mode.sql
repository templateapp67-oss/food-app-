insert into public.nexora_food_app_settings(key,value)values('experience.customer_mode','"live"'::jsonb)on conflict(key)do nothing;
create policy food_customer_experience_public on public.nexora_food_app_settings for select to anon,authenticated using(key='experience.customer_mode');
create or replace function public.nexora_food_public_config()returns jsonb language sql stable security invoker set search_path=''as $$select coalesce(jsonb_object_agg(key,value),'{}')from public.nexora_food_app_settings where key in('cod.enabled','payments.online_enabled','loyalty.earn_per_paise','loyalty.redeem_paise_per_100_points','experience.customer_mode')$$;
create function nexora_food_private.set_experience_mode(p_mode text,p_reason text)returns void language plpgsql security definer set search_path=''as $$
begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin access required';end if;
 if p_mode is null or p_mode not in('live','demo')then raise exception 'Choose Live or Demo mode';end if;
 if p_reason is null or length(trim(p_reason))not between 3 and 2000 then raise exception 'Enter a reason between 3 and 2000 characters';end if;
 insert into public.nexora_food_app_settings(key,value,updated_by)values('experience.customer_mode',to_jsonb(p_mode),auth.uid())on conflict(key)do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now();
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'set-customer-experience','app_settings','experience.customer_mode',jsonb_build_object('mode',p_mode),trim(p_reason));
end$$;
create function public.nexora_food_set_experience_mode(p_mode text,p_reason text)returns void language sql security invoker set search_path=''as $$select nexora_food_private.set_experience_mode(p_mode,p_reason)$$;
revoke all on function nexora_food_private.set_experience_mode(text,text),public.nexora_food_set_experience_mode(text,text)from public,anon;
grant execute on function nexora_food_private.set_experience_mode(text,text),public.nexora_food_set_experience_mode(text,text)to authenticated;
