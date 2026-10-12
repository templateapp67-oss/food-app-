begin;
create temporary table approval_fixture(admin uuid,customer uuid,pending uuid,review uuid);
insert into approval_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
grant select on approval_fixture to authenticated,anon;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','approval-qa-'||id||'@example.invalid','{"full_name":"Approval QA"}','{}',now(),now(),now()from approval_fixture cross join lateral(values(admin),(customer))f(id);
insert into public.nexora_food_user_roles(user_id,role)select admin,'super_admin'from approval_fixture;
insert into public.nexora_food_restaurants(id,name,slug,address,city,location,status)
select id,'Approval test kitchen',id::text,'Jhotwara, Jaipur','Jaipur',extensions.ST_SetSRID(extensions.ST_MakePoint(75.758,26.945),4326)::extensions.geography,status from approval_fixture cross join lateral(values(pending,'pending'),(review,'under_review'))f(id,status);
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from approval_fixture),true);
do $$begin
 if exists(select 1 from public.nexora_food_restaurants where id in(select pending from approval_fixture union select review from approval_fixture))then raise exception 'Unapproved restaurants leaked to customer';end if;
 begin perform public.nexora_food_admin_restaurant_status((select pending from approval_fixture),'active','Customer self approval');raise exception 'Customer approved restaurant';exception when others then if sqlerrm='Customer approved restaurant'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select admin::text from approval_fixture),true);
do $$begin
 if(select count(*)from public.nexora_food_restaurants where id in(select pending from approval_fixture union select review from approval_fixture))<>2 then raise exception 'Admin cannot see pending/under-review restaurants';end if;
 begin perform public.nexora_food_admin_restaurant_status((select review from approval_fixture),'rejected','');raise exception 'Empty rejection reason accepted';exception when others then if sqlerrm='Empty rejection reason accepted'then raise;end if;end;
 perform public.nexora_food_admin_restaurant_status((select pending from approval_fixture),'active','Approved QA kitchen');
 perform public.nexora_food_admin_restaurant_status((select review from approval_fixture),'rejected','Missing application details');
 if not exists(select 1 from public.nexora_food_restaurants where id=(select review from approval_fixture)and status='rejected'and rejection_reason='Missing application details')then raise exception 'Rejection reason missing';end if;
 if not exists(select 1 from public.nexora_food_admin_audit_logs where entity_id=(select review::text from approval_fixture)and action='restaurant-status'and reason='Missing application details')then raise exception 'Decision audit missing';end if;
end$$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 if not exists(select 1 from public.nexora_food_restaurants where id=(select pending from approval_fixture)and status='active')then raise exception 'Approved restaurant not in customer catalog';end if;
 if exists(select 1 from public.nexora_food_restaurants where id=(select review from approval_fixture))then raise exception 'Rejected listing visible to customer';end if;
end$$;
rollback;
