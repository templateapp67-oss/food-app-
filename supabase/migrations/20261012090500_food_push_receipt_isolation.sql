-- A same-owner token refresh must not cancel a claimed/retryable push.
create or replace function nexora_food_private.register_device_token(p_token text,p_platform text,p_app_version text default null)returns uuid language plpgsql security definer set search_path=''as $$declare result uuid;begin
 if auth.uid()is null or not exists(select 1 from public.nexora_food_profiles where id=auth.uid()and not is_blocked)then raise exception 'Active sign-in required';end if;
 if coalesce(length(p_token),0)not between 20 and 4096 or p_token~'[[:space:]]'or p_platform is null or p_platform not in('web','android','ios')or length(coalesce(p_app_version,''))>80 then raise exception 'Invalid device token or platform';end if;
 if exists(select 1 from public.nexora_food_deletion_requests where user_id=auth.uid()and status in('processing','completed'))then raise exception 'Account deletion is processing';end if;
 insert into public.nexora_food_device_tokens(user_id,token,platform,app_version,last_seen_at,is_active)values(auth.uid(),p_token,p_platform,p_app_version,now(),true)
 on conflict(token)do update set user_id=excluded.user_id,platform=excluded.platform,app_version=excluded.app_version,last_seen_at=now(),is_active=true,updated_at=case when nexora_food_device_tokens.user_id<>excluded.user_id or nexora_food_device_tokens.platform<>excluded.platform or not nexora_food_device_tokens.is_active then clock_timestamp()else nexora_food_device_tokens.updated_at end returning id into result;return result;end$$;
-- Each requesting device gets an independent receipt; opening a second device cannot revoke the first.
alter table nexora_food_private.deletion_receipts drop constraint deletion_receipts_pkey;
alter table nexora_food_private.deletion_receipts add column id uuid not null default gen_random_uuid() primary key;
create index food_deletion_receipts_request on nexora_food_private.deletion_receipts(request_id);
create or replace function nexora_food_private.deletion_receipt(p_request uuid)returns text language plpgsql security definer set search_path=''as $$declare token text;begin
 if auth.uid()is null or not exists(select 1 from public.nexora_food_deletion_requests where id=p_request and user_id=auth.uid())then raise exception 'Own deletion request required';end if;
 perform 1 from public.nexora_food_deletion_requests where id=p_request for update;
 delete from nexora_food_private.deletion_receipts where expires_at<now();
 if(select count(*)from nexora_food_private.deletion_receipts where request_id=p_request)>=100 then raise exception 'Too many active deletion receipts; reuse your existing device receipt';end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');insert into nexora_food_private.deletion_receipts(request_id,token_hash)values(p_request,encode(extensions.digest(token,'sha256'),'hex'));return token;end$$;
notify pgrst,'reload schema';
