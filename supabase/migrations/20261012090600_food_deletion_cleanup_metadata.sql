-- Keep administrative status timestamps accurate and scrub non-financial free text.
create trigger food_deletion_updated before update on public.nexora_food_deletion_requests for each row execute function public.nexora_food_set_updated_at();
do $$declare def text;begin
 select pg_get_functiondef('nexora_food_private.prepare_deletion(uuid)'::regprocedure)into def;
 if strpos(def,'update public.nexora_food_profiles set full_name=null')=0 then raise exception 'Expected Food anonymization implementation missing';end if;
 def:=replace(def,'update public.nexora_food_profiles set full_name=null',
 'delete from nexora_food_private.deletion_challenges where user_id=u or email_hash in(select encode(extensions.digest(lower(trim(email)),''sha256''),''hex'')from auth.users where id=u union select encode(extensions.digest(lower(trim(email)),''sha256''),''hex'')from public.nexora_food_profiles where id=u); update public.nexora_food_profiles set full_name=null');
 def:=replace(def,'cancel_reason=case when cancelled_by=u then null else cancel_reason end','cancel_reason=null');
 def:=replace(def,'update public.nexora_food_order_status_history set actor_id=d.id,note=null where actor_id=u;',
 'update public.nexora_food_order_status_history set actor_id=case when actor_id=u then d.id else actor_id end,note=null where actor_id=u or order_id in(select id from public.nexora_food_orders where anonymized_account=d.id);');
 def:=replace(def,'update public.nexora_food_refunds set requested_by=d.id,reason=''Retained financial record'' where requested_by=u;',
 'update public.nexora_food_refunds set requested_by=case when requested_by=u then d.id else requested_by end,reason=''Retained financial record'' where requested_by=u or order_id in(select id from public.nexora_food_orders where anonymized_account=d.id);');
 def:=replace(def,'where actor_id=u or entity_id=u::text or coalesce(before::text,'''')',
 'where actor_id=u or entity_id=u::text or entity_id in(select id::text from public.nexora_food_orders where anonymized_account=d.id) or coalesce(before::text,'''')');
 execute def;
end$$;
notify pgrst,'reload schema';
