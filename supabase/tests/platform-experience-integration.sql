begin;
create temporary table mode_fixture(admin uuid,customer uuid);
insert into mode_fixture select gen_random_uuid(),gen_random_uuid();grant select on mode_fixture to authenticated;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','mode-qa-'||id||'@example.invalid','{"full_name":"Mode QA"}','{}',now(),now(),now()from mode_fixture cross join lateral(values(admin),(customer))f(id);
insert into public.nexora_food_user_roles(user_id,role)select admin,'super_admin'from mode_fixture;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from mode_fixture),true);
do $$begin begin perform public.nexora_food_set_experience_mode('demo','Customer attempt');raise exception 'Customer changed platform mode';exception when others then if sqlerrm='Customer changed platform mode'then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub',(select admin::text from mode_fixture),true);
select public.nexora_food_set_experience_mode('demo','Demo launch preview');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin if public.nexora_food_public_config()->>'experience.customer_mode'<>'demo'then raise exception 'Guest cannot read selected demo mode';end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select admin::text from mode_fixture),true);
do $$begin
 begin perform public.nexora_food_set_experience_mode('invalid','Invalid mode');raise exception 'Invalid mode allowed';exception when others then if sqlerrm='Invalid mode allowed'then raise;end if;end;
 perform public.nexora_food_set_experience_mode('live','Enable original catalog');
 if public.nexora_food_public_config()->>'experience.customer_mode'<>'live'then raise exception 'Live mode did not persist';end if;
 if not exists(select 1 from public.nexora_food_admin_audit_logs where action='set-customer-experience'and actor_id=auth.uid())then raise exception 'Mode decision audit missing';end if;
end$$;
rollback;
