-- Run with a database-owner test connection. All fixtures and auth-trigger side effects roll back.
begin;
set local statement_timeout='15s';
create temporary table food_fixture(customer uuid,owner uuid,rider uuid,admin uuid,restaurant uuid,dish uuid,address uuid,quote jsonb,ordered jsonb);
insert into food_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),coalesce((select user_id from public.nexora_food_user_roles where role='super_admin'limit 1),gen_random_uuid()),null,null,null,null,null;
grant all on food_fixture to authenticated;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select test_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','food-test-'||test_id||'@example.invalid','{"full_name":"Food transactional test","role":"super_admin"}','{}',now(),now(),now()from food_fixture f cross join lateral unnest(array[f.customer,f.owner,f.rider,f.admin])as test_user(test_id) where not exists(select 1 from auth.users u where u.id=test_user.test_id);
insert into public.nexora_food_user_roles(user_id,role)select admin,'super_admin'from food_fixture on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from food_fixture),true);
do $$begin
 if(select count(*)from public.nexora_food_locations where is_active)<126 then raise exception 'Jaipur locality catalog missing';end if;
 perform public.nexora_food_save_address('{"type":"other","line1":"24 Added Test Street","locality":"Chomu","pincode":"303702","latitude":27.082,"longitude":75.723}');
 if(select count(*)from public.nexora_food_profiles)<>1 then raise exception 'Profile isolation failed';end if;
 if exists(select 1 from public.nexora_food_user_roles where role<>'customer')then raise exception 'Metadata role escalation';end if;
 begin perform public.nexora_food_admin_role((select customer from food_fixture),'super_admin','attempted escalation');raise exception 'Role escalation allowed';exception when others then if sqlerrm='Role escalation allowed'then raise;end if;end;
 begin insert into public.nexora_food_user_roles(user_id,role)select customer,'super_admin'from food_fixture;raise exception 'Direct role write allowed';exception when insufficient_privilege then null;end;
 begin perform public.nexora_food_save_address('{"latitude":28.6,"longitude":77.2,"locality":"C Scheme","line1":"Outside Jaipur","pincode":"302001"}');raise exception 'Outside Jaipur allowed';exception when others then if sqlerrm='Outside Jaipur allowed'then raise;end if;end;
 update food_fixture set address=public.nexora_food_save_address('{"type":"home","line1":"24 Test Street","locality":"C Scheme","pincode":"302001","latitude":26.9124,"longitude":75.7873}');
end$$;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
update food_fixture set restaurant=public.nexora_food_apply_restaurant('{"name":"Transactional Kitchen","slug":"food-transactional-kitchen-test","address":"Test Street, C Scheme","latitude":26.9124,"longitude":75.7873,"phone":"9876543210"}');
update food_fixture set dish=public.nexora_food_save_menu_item(jsonb_build_object('restaurant_id',restaurant,'name','Paneer test','price_paise',25000,'is_veg',true,'is_available',true));
select public.nexora_food_save_images(restaurant,'https://example.invalid/cover.webp',array['https://example.invalid/gallery.webp'],array['https://example.invalid/menu.webp'])from food_fixture;
do $$begin if not exists(select 1 from public.nexora_food_restaurants where id=(select restaurant from food_fixture)and phone='9876543210'and cover_url='https://example.invalid/cover.webp'and cardinality(menu_pages)=1)then raise exception 'Photo save changed unrelated profile fields';end if;end$$;
select public.nexora_food_set_hours(restaurant,(select jsonb_agg(jsonb_build_object('weekday',d,'opens','00:00','closes','23:59:59','is_closed',false))from generate_series(0,6)d))from food_fixture;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_admin_restaurant_status(restaurant,'active','transactional test approval')from food_fixture;
select public.nexora_food_set_zone(restaurant,26.9124,75.7873,5000,'transactional test zone')from food_fixture;
select public.nexora_food_admin_role(rider,'rider','transactional test rider')from food_fixture;
do $$begin if(select count(*)from public.nexora_food_user_roles where role='super_admin')=1 then begin perform public.nexora_food_admin_access((select admin from food_fixture),'super_admin','revoke',null,'test last admin');raise exception 'Last admin removal allowed';exception when others then if sqlerrm='Last admin removal allowed'then raise;end if;end;end if;end$$;
select set_config('request.jwt.claim.sub',(select customer::text from food_fixture),true);
update food_fixture set quote=public.nexora_food_quote_cart(restaurant,jsonb_build_array(jsonb_build_object('item_id',dish,'quantity',2)),address,null,0);
update food_fixture set ordered=public.nexora_food_place_order(restaurant,jsonb_build_array(jsonb_build_object('item_id',dish,'quantity',2)),address,null,0,'food-test-checkout-key','cod',(quote->>'quote_id')::uuid);
do $$declare repeated jsonb;begin
 select public.nexora_food_place_order(restaurant,jsonb_build_array(jsonb_build_object('item_id',dish,'quantity',2)),address,null,0,'food-test-checkout-key','cod',(quote->>'quote_id')::uuid)into repeated from food_fixture;
 if repeated<>(select ordered from food_fixture)then raise exception 'Idempotency failed';end if;
 if(select total_paise from public.nexora_food_orders where id=(select(ordered->>'id')::uuid from food_fixture))<>52900 then raise exception 'Server totals failed';end if;
 begin perform public.nexora_food_transition_order((select(ordered->>'id')::uuid from food_fixture),'delivered');raise exception 'Customer delivery allowed';exception when others then if sqlerrm='Customer delivery allowed'then raise;end if;end;
 begin perform public.nexora_food_submit_review((select(ordered->>'id')::uuid from food_fixture),5,'too early');raise exception 'Undelivered review allowed';exception when others then if sqlerrm='Undelivered review allowed'then raise;end if;end;
 begin perform public.nexora_food_save_images((select restaurant from food_fixture),'https://example.invalid/unauthorized.webp','{}','{}');raise exception 'Customer photo edit allowed';exception when others then if sqlerrm='Customer photo edit allowed'then raise;end if;end;
 begin perform public.nexora_food_save_menu_item(jsonb_build_object('restaurant_id',(select restaurant from food_fixture),'name','Unauthorized dish','price_paise',1,'is_veg',true,'is_available',true));raise exception 'Cross-restaurant edit allowed';exception when others then if sqlerrm='Cross-restaurant edit allowed'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
select public.nexora_food_transition_order((ordered->>'id')::uuid,'confirmed')from food_fixture;
select public.nexora_food_transition_order((ordered->>'id')::uuid,'preparing')from food_fixture;
select public.nexora_food_transition_order((ordered->>'id')::uuid,'ready_for_pickup')from food_fixture;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
do $$begin if exists(select 1 from public.nexora_food_orders)then raise exception 'Unassigned rider can read orders';end if;end$$;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_admin_assign_rider((ordered->>'id')::uuid,rider,'transactional test assignment')from food_fixture;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
do $$begin if(select count(*)from public.nexora_food_orders)<>1 then raise exception 'Assigned rider cannot see delivery';end if;end$$;
select public.nexora_food_rider_location((ordered->>'id')::uuid,26.9124,75.7873)from food_fixture;
select public.nexora_food_transition_order((ordered->>'id')::uuid,'out_for_delivery')from food_fixture;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_admin_access(rider,'rider','revoke',null,'test revoke')from food_fixture;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
do $$begin if exists(select 1 from public.nexora_food_orders)then raise exception 'Revoked rider can read';end if;begin perform public.nexora_food_transition_order((select(ordered->>'id')::uuid from food_fixture),'delivered');raise exception 'Revoked rider can deliver';exception when others then if sqlerrm='Revoked rider can deliver'then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_admin_role(rider,'rider','test reactivation')from food_fixture;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
select public.nexora_food_transition_order((ordered->>'id')::uuid,'delivered')from food_fixture;
do $$begin if not exists(select 1 from public.nexora_food_delivery_assignments where status='delivered'and delivered_at is not null)then raise exception 'Delivery assignment not synchronized';end if;end$$;
select set_config('request.jwt.claim.sub',(select customer::text from food_fixture),true);
select public.nexora_food_submit_review((ordered->>'id')::uuid,5,'Verified test review')from food_fixture;
do $$begin
 if not exists(select 1 from public.nexora_food_restaurants where id=(select restaurant from food_fixture)and rating_avg=5 and rating_count=1)then raise exception 'Review aggregation failed';end if;
 if not exists(select 1 from public.nexora_food_orders where payment_status='cod_collected'and status='delivered')then raise exception 'COD collection failed';end if;
 if not exists(select 1 from public.nexora_food_loyalty_accounts where balance_points=5)then raise exception 'Rewards accrual failed';end if;
 if not exists(select 1 from public.nexora_food_user_notifications)then raise exception 'Order notification missing';end if;
 if not nexora_food_private.image_member((select restaurant::text||'/photo.webp'from food_fixture))=false then raise exception 'Customer image write allowed';end if;
end$$;
reset role;
rollback;
select 'passed: account isolation, escalation denial, Jaipur restriction, restaurant ownership, server pricing, COD idempotency, assigned rider delivery, review aggregation, rewards, notifications; fixtures rolled back' as food_integration;
-- Online checkout cannot be re-enabled during the COD-only launch.
do $$ begin
 begin
  update public.nexora_food_app_settings set value='true'::jsonb where key='payments.online_enabled';
  raise exception 'Expected COD-only constraint';
 exception when check_violation then null;
 end;
end $$;
