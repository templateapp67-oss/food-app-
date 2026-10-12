create or replace function nexora_food_private.set_experience_mode(p_mode text,p_reason text)returns void language plpgsql security definer set search_path=''as $$
begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin access required';end if;
 if p_mode is null or p_mode not in('live','demo')then raise exception 'Choose Live or Demo mode';end if;
 if p_reason is null or length(trim(p_reason))not between 3 and 2000 then raise exception 'Enter a reason between 3 and 2000 characters';end if;
 if p_mode='demo' and lower(trim(p_reason)) in('show original approved restaurants','enable live food ordering') then raise exception 'Choose Live mode to show original approved restaurants. Demo mode shows sample restaurants only.';end if;
 insert into public.nexora_food_app_settings(key,value,updated_by)values('experience.customer_mode',to_jsonb(p_mode),auth.uid())on conflict(key)do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now();
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'set-customer-experience','app_settings','experience.customer_mode',jsonb_build_object('mode',p_mode),trim(p_reason));
end$$;
