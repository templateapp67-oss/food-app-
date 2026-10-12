-- A temporary receipt lets the requesting device observe completion after Auth removal.
create table nexora_food_private.deletion_receipts(request_id uuid primary key references public.nexora_food_deletion_requests(id),token_hash text not null unique,expires_at timestamptz not null default now()+interval '14 days');
alter table nexora_food_private.deletion_receipts enable row level security;
create policy food_receipt_internal on nexora_food_private.deletion_receipts for all to authenticated,anon using(false)with check(false);
revoke all on nexora_food_private.deletion_receipts from public,anon,authenticated;
grant all on nexora_food_private.deletion_receipts to service_role;
create function nexora_food_private.deletion_receipt(p_request uuid)returns text language plpgsql security definer set search_path=''as $$declare token text;begin
 if auth.uid()is null or not exists(select 1 from public.nexora_food_deletion_requests where id=p_request and user_id=auth.uid())then raise exception 'Own deletion request required';end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into nexora_food_private.deletion_receipts(request_id,token_hash)values(p_request,encode(extensions.digest(token,'sha256'),'hex'))on conflict(request_id)do update set token_hash=excluded.token_hash,expires_at=now()+interval '14 days';return token;end$$;
create function nexora_food_private.deletion_receipt_status(p_hash text)returns jsonb language sql stable security definer set search_path=''as $$select jsonb_build_object('status',d.status,'updated_at',d.updated_at,'completed_at',d.completed_at,'blocker_code',d.blocker_code)from nexora_food_private.deletion_receipts r join public.nexora_food_deletion_requests d on d.id=r.request_id where r.token_hash=p_hash and r.expires_at>now()$$;
create function public.nexora_food_deletion_receipt(p_request uuid)returns text language sql security invoker set search_path=''as $$select nexora_food_private.deletion_receipt(p_request)$$;
create function public.nexora_food_deletion_receipt_status(p_hash text)returns jsonb language sql stable security invoker set search_path=''as $$select nexora_food_private.deletion_receipt_status(p_hash)$$;
revoke all on function nexora_food_private.deletion_receipt(uuid),public.nexora_food_deletion_receipt(uuid)from public,anon;
grant execute on function nexora_food_private.deletion_receipt(uuid),public.nexora_food_deletion_receipt(uuid)to authenticated;
revoke all on function nexora_food_private.deletion_receipt_status(text),public.nexora_food_deletion_receipt_status(text)from public,anon,authenticated;
grant execute on function nexora_food_private.deletion_receipt_status(text),public.nexora_food_deletion_receipt_status(text)to service_role;
create function nexora_food_private.push_allowed(p_notification uuid,p_token uuid,p_claim uuid)returns boolean language sql stable security definer set search_path=''as $$select exists(select 1 from nexora_food_private.push_attempts a join public.nexora_food_user_notifications n on n.id=a.notification_id join public.nexora_food_device_tokens t on t.id=a.token_id join public.nexora_food_profiles p on p.id=n.user_id where a.notification_id=p_notification and a.token_id=p_token and a.claim=p_claim and a.status='sending' and t.user_id=n.user_id and t.updated_at=a.token_version and t.is_active and not p.is_blocked and not exists(select 1 from public.nexora_food_deletion_requests d where d.user_id=n.user_id and d.status in('processing','completed')))$$;
create function public.nexora_food_push_allowed(p_notification uuid,p_token uuid,p_claim uuid)returns boolean language sql stable security invoker set search_path=''as $$select nexora_food_private.push_allowed(p_notification,p_token,p_claim)$$;
revoke all on function nexora_food_private.push_allowed(uuid,uuid,uuid),public.nexora_food_push_allowed(uuid,uuid,uuid)from public,anon,authenticated;
grant execute on function nexora_food_private.push_allowed(uuid,uuid,uuid),public.nexora_food_push_allowed(uuid,uuid,uuid)to service_role;
notify pgrst,'reload schema';
