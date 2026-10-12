begin;
create temporary table food_gap_fixture(customer uuid,other_user uuid,restaurant uuid,order_id uuid,token_id uuid,notification_id uuid,request_id uuid,receipt text);
insert into food_gap_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null,null,null,null;
grant all on food_gap_fixture to authenticated,service_role;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','food-critical-qa-'||id||'@example.invalid','{"full_name":"Temporary Food QA"}','{}',now(),now(),now() from food_gap_fixture cross join lateral(values(customer),(other_user))f(id);
insert into public.nexora_food_restaurants(id,name,slug,address,city,location,status)select restaurant,'Food gap QA',restaurant::text,'Jhotwara Jaipur','Jaipur',extensions.ST_SetSRID(extensions.ST_MakePoint(75.735,26.956),4326)::extensions.geography,'active'from food_gap_fixture;
insert into public.nexora_food_orders(id,user_id,restaurant_id,restaurant_name_snapshot,address_snapshot,status,payment_method,payment_status,items_subtotal_paise,delivery_fee_paise,tax_paise,total_paise,idempotency_key)
select order_id,customer,restaurant,'Food gap QA','{"line1":"Private home","phone":"private","locality":"Jhotwara","city":"Jaipur"}','placed','cod','cod_pending',10000,0,0,10000,'critical-qa-'||order_id from food_gap_fixture;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from food_gap_fixture),true);
update food_gap_fixture set token_id=public.nexora_food_register_device_token(repeat('a',80),'web','qa');
do $$begin
 begin perform public.nexora_food_register_device_token('short','bad',null);raise exception 'Invalid token accepted';exception when others then if sqlerrm='Invalid token accepted'then raise;end if;end;
 begin perform public.nexora_food_request_deletion('DELETE');raise exception 'No password AMR accepted';exception when others then if sqlerrm='No password AMR accepted'then raise;end if;end;
 begin perform public.nexora_food_claim_push(gen_random_uuid());raise exception 'Client called service worker';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',(select other_user::text from food_gap_fixture),true);
do $$begin
 if exists(select 1 from public.nexora_food_device_tokens where id=(select token_id from food_gap_fixture))then raise exception 'Foreign token readable';end if;
 begin update public.nexora_food_device_tokens set user_id=auth.uid();raise exception 'Direct token overwrite allowed';exception when insufficient_privilege then null;end;
 perform public.nexora_food_unregister_device_token(repeat('a',80));
end$$;
reset role;
do $$begin if not exists(select 1 from public.nexora_food_device_tokens where id=(select token_id from food_gap_fixture)and is_active)then raise exception 'Foreign user disabled token';end if;end$$;
-- Status-trigger events enqueue once and ready_for_pickup does not push.
update public.nexora_food_orders set status='confirmed'where id=(select order_id from food_gap_fixture);
update food_gap_fixture set notification_id=(select id from public.nexora_food_user_notifications where dedupe_key=order_id::text||':confirmed');
do $$declare jobs jsonb;j jsonb;begin
 if (select count(*)from public.nexora_food_notification_deliveries where notification_id=(select notification_id from food_gap_fixture))<>1 then raise exception 'Missing enqueue';end if;
 jobs:=public.nexora_food_claim_push((select notification_id from food_gap_fixture));if jsonb_array_length(jobs)<>1 then raise exception 'Missing token work';end if;j:=jobs->0;
 if jsonb_array_length(public.nexora_food_claim_push((select notification_id from food_gap_fixture)))<>0 then raise exception 'Duplicate claim';end if;
 perform public.nexora_food_finish_push((j->>'notification_id')::uuid,(j->>'token_id')::uuid,(j->>'claim')::uuid,'invalid');
 if exists(select 1 from public.nexora_food_device_tokens where id=(j->>'token_id')::uuid and is_active)then raise exception 'Invalid token stayed active';end if;
 if jsonb_array_length(public.nexora_food_claim_push((select notification_id from food_gap_fixture)))<>0 then raise exception 'Final delivery retried';end if;
end$$;
update public.nexora_food_orders set status='preparing'where id=(select order_id from food_gap_fixture);
do $$declare nid uuid;begin select id into nid from public.nexora_food_user_notifications where dedupe_key=(select order_id::text||':preparing'from food_gap_fixture);perform public.nexora_food_claim_push(nid);if not exists(select 1 from public.nexora_food_notification_deliveries where notification_id=nid and status='no_token')then raise exception 'No-token state missing';end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from food_gap_fixture),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',(select customer::text from food_gap_fixture),'role','authenticated','amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)))::text,true);
update food_gap_fixture set request_id=public.nexora_food_request_deletion('DELETE');
select public.nexora_food_cancel_deletion((select request_id from food_gap_fixture));
update food_gap_fixture set request_id=public.nexora_food_request_deletion('DELETE');
update food_gap_fixture set receipt=public.nexora_food_deletion_receipt(request_id);
reset role;
do $$begin
 if public.nexora_food_deletion_receipt_status(encode(extensions.digest((select receipt from food_gap_fixture),'sha256'),'hex'))->>'status'<>'requested' then raise exception 'Receipt unavailable';end if;
 perform public.nexora_food_prepare_deletion((select request_id from food_gap_fixture));
 if not exists(select 1 from public.nexora_food_deletion_requests where id=(select request_id from food_gap_fixture)and status='blocked_active_orders')then raise exception 'Active order did not block';end if;
end$$;
update public.nexora_food_orders set status='cancelled'where id=(select order_id from food_gap_fixture);
-- Public verification requires an unexpired one-use secret and is service-only.
do $$declare challenge jsonb;tokenhash text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');email text;begin
 email:='food-critical-qa-'||(select customer::text from food_gap_fixture)||'@example.invalid';
 challenge:=public.nexora_food_create_deletion_challenge(email,repeat('d',64),tokenhash);
 if not(challenge->>'send_email')::boolean then raise exception 'Verified account lookup failed';end if;
 begin perform public.nexora_food_verify_deletion_challenge(tokenhash,'NO');raise exception 'Missing confirmation accepted';exception when others then if sqlerrm='Missing confirmation accepted'then raise;end if;end;
 perform public.nexora_food_verify_deletion_challenge(tokenhash,'DELETE');
 begin perform public.nexora_food_verify_deletion_challenge(tokenhash,'DELETE');raise exception 'Verification replay accepted';exception when others then if sqlerrm='Verification replay accepted'then raise;end if;end;
end$$;
-- Isolated fixture policy is transaction-only, never persists to production.
update public.nexora_food_app_settings set value='{"reviewed":true,"financial_retention_days":365,"public_text":"Transactional QA policy"}'where key='deletion.retention_policy';
do $$declare u uuid;r uuid;work jsonb;begin
 select customer,request_id into u,r from food_gap_fixture;
 work:=public.nexora_food_prepare_deletion(r);
 if nexora_food_private.shared_account_linked(u) then
 if not exists(select 1 from public.nexora_food_deletion_requests where id=r and blocker_code='shared_account_coordination_required')then raise exception 'Shared-account guard failed';end if;
 raise notice 'Shared stack: verified cross-product protection; full anonymization executes on isolated CI stack.';
 else
 if not(work->>'ready')::boolean then raise exception 'Eligible worker did not claim';end if;
 if not exists(select 1 from public.nexora_food_orders where id=(select order_id from food_gap_fixture)and user_id is null and anonymized_account=r and address_snapshot='{"locality":"Jhotwara","city":"Jaipur"}'::jsonb)then raise exception 'Financial anonymization failed';end if;
 if not exists(select 1 from public.nexora_food_restaurant_earnings where order_id=(select order_id from food_gap_fixture))then raise exception 'Financial ledger removed';end if;
 if exists(select 1 from public.nexora_food_device_tokens where user_id=u)then raise exception 'Token retained';end if;
 if (public.nexora_food_prepare_deletion(r)->>'ready')::boolean then raise exception 'Concurrent cleanup claimed';end if;
 perform public.nexora_food_finish_deletion(r,'storage_done');
 delete from auth.users where id=u; -- QA fixture only, after guard, transaction rolls back.
 perform public.nexora_food_finish_deletion(r,'completed');perform public.nexora_food_finish_deletion(r,'completed');
 if (select count(*)from public.nexora_food_admin_audit_logs where entity_id=r::text and action='deletion-completed')<>1 then raise exception 'Duplicate completion audit';end if;
 end if;
end$$;
-- Check last-admin guard using ONLY Food role fixtures; changes roll back.
delete from public.nexora_food_user_roles where role='super_admin';
insert into public.nexora_food_user_roles(user_id,role)select other_user,'super_admin'from food_gap_fixture;
do $$begin if not('last_super_admin'=any(nexora_food_private.deletion_blockers((select other_user from food_gap_fixture))))then raise exception 'Last Super Admin not protected';end if;end$$;
select 'PASS: token RLS, enqueue, idempotency, invalidation, blockers, cancel, shared-account guard; isolated stack also checks anonymization/completion' as result;
rollback;
