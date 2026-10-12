create table nexora_food_private.deletion_challenges(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id) on delete set null,email_hash text not null,ip_hash text not null,token_hash text not null unique,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',used_at timestamptz);
alter table nexora_food_private.deletion_challenges enable row level security;
create policy food_challenge_internal on nexora_food_private.deletion_challenges for all to anon,authenticated using(false) with check(false);
revoke all on nexora_food_private.deletion_challenges from public,anon,authenticated;
grant all on nexora_food_private.deletion_challenges to service_role;
create index food_challenge_email_limit on nexora_food_private.deletion_challenges(email_hash,created_at);
create index food_challenge_ip_limit on nexora_food_private.deletion_challenges(ip_hash,created_at);
create function nexora_food_private.create_deletion_challenge(p_email text,p_ip_hash text,p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid;eid text;cid uuid;begin
 eid:=encode(extensions.digest(lower(trim(p_email)),'sha256'),'hex');
 if p_email is null or length(p_email)>254 or p_email!~'^[^ @]+@[^ @]+\.[^ @]+$' or p_ip_hash!~'^[0-9a-f]{64}$' or p_token_hash!~'^[0-9a-f]{64}$' then raise exception 'Invalid verification request';end if;
 perform pg_advisory_xact_lock(hashtextextended('food-delete-ip:'||p_ip_hash,0));perform pg_advisory_xact_lock(hashtextextended('food-delete-email:'||eid,0));
 delete from nexora_food_private.deletion_challenges where created_at<now()-interval '24 hours';
 if (select count(*) from nexora_food_private.deletion_challenges where email_hash=eid and created_at>now()-interval '1 hour')>=3 or (select count(*) from nexora_food_private.deletion_challenges where ip_hash=p_ip_hash and created_at>now()-interval '1 hour')>=10 then raise exception 'Too many requests; try later';end if;
 select u.id into uid from auth.users u join public.nexora_food_profiles p on p.id=u.id where lower(u.email)=lower(trim(p_email)) and u.email_confirmed_at is not null;
 insert into nexora_food_private.deletion_challenges(user_id,email_hash,ip_hash,token_hash)values(uid,eid,p_ip_hash,p_token_hash) returning id into cid;
 return jsonb_build_object('id',cid,'send_email',uid is not null);
end$$;
create function nexora_food_private.verify_deletion_challenge(p_token_hash text,p_confirmation text) returns uuid language plpgsql security definer set search_path='' as $$
declare c nexora_food_private.deletion_challenges;result uuid;begin
 if p_confirmation is distinct from 'DELETE' then raise exception 'Type DELETE to confirm';end if;
 select * into c from nexora_food_private.deletion_challenges where token_hash=p_token_hash and used_at is null and expires_at>now() for update;if not found or c.user_id is null then raise exception 'Verification expired or invalid';end if;
 perform pg_advisory_xact_lock(hashtextextended('nexora-food-super-admin-management',0));
 if 'last_super_admin'=any(nexora_food_private.deletion_blockers(c.user_id)) then raise exception 'Keep at least one active Super Admin';end if;
 insert into public.nexora_food_deletion_requests(user_id)values(c.user_id)on conflict(user_id)where status in('requested','processing','blocked_active_orders')do update set updated_at=public.nexora_food_deletion_requests.updated_at returning id into result;
 update nexora_food_private.deletion_challenges set used_at=now(),user_id=null where id=c.id;
 update public.nexora_food_profiles set deletion_requested_at=now(),marketing_opt_in=false where id=c.user_id;return result;
end$$;
create function public.nexora_food_create_deletion_challenge(p_email text,p_ip_hash text,p_token_hash text)returns jsonb language sql security invoker set search_path='' as $$select nexora_food_private.create_deletion_challenge(p_email,p_ip_hash,p_token_hash)$$;
create function public.nexora_food_verify_deletion_challenge(p_token_hash text,p_confirmation text)returns uuid language sql security invoker set search_path='' as $$select nexora_food_private.verify_deletion_challenge(p_token_hash,p_confirmation)$$;
revoke all on function nexora_food_private.create_deletion_challenge(text,text,text),nexora_food_private.verify_deletion_challenge(text,text),public.nexora_food_create_deletion_challenge(text,text,text),public.nexora_food_verify_deletion_challenge(text,text)from public,anon,authenticated;
grant execute on function nexora_food_private.create_deletion_challenge(text,text,text),nexora_food_private.verify_deletion_challenge(text,text),public.nexora_food_create_deletion_challenge(text,text,text),public.nexora_food_verify_deletion_challenge(text,text)to service_role;
notify pgrst,'reload schema';
