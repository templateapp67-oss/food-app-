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
 perform public.nexora_food_save_account('Updated customer','+919876543210',auth.uid()::text||'/avatar.png');
 perform public.nexora_food_ensure_account();
 if not exists(select 1 from public.nexora_food_profiles where id=auth.uid() and full_name='Updated customer' and phone='+919876543210' and avatar_url=auth.uid()::text||'/avatar.png') then raise exception 'Account details or avatar did not persist';end if;
 perform public.nexora_food_save_account('Updated again','9876543210',null);
 if not exists(select 1 from public.nexora_food_profiles where phone='9876543210' and avatar_url=auth.uid()::text||'/avatar.png') then raise exception 'Details-only save lost avatar';end if;
 begin perform public.nexora_food_save_account('Invalid phone','123',null);raise exception 'Invalid phone accepted';exception when others then if sqlerrm='Invalid phone accepted' then raise;end if;end;
 begin perform public.nexora_food_save_account('Wrong owner','9876543210',(select owner::text||'/avatar.png' from food_fixture));raise exception 'Another avatar owner accepted';exception when others then if sqlerrm='Another avatar owner accepted' then raise;end if;end;
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
reset role;
insert into storage.objects(bucket_id,name,owner,metadata)select 'nexora-food-documents',restaurant::text||'/initial-fssai.png',owner,'{"mimetype":"image/png","size":512}'::jsonb from food_fixture;
insert into public.nexora_food_restaurant_documents(restaurant_id,kind,storage_path,status,uploaded_by,reviewed_by)select restaurant,'fssai',restaurant::text||'/initial-fssai.png','approved',owner,admin from food_fixture;
set local role authenticated;
select public.nexora_food_admin_restaurant_status(restaurant,'active','transactional test approval')from food_fixture;
select public.nexora_food_set_zone(restaurant,26.9124,75.7873,5000,'transactional test zone')from food_fixture;
select public.nexora_food_admin_role(rider,'rider','transactional test rider')from food_fixture;
do $$begin if(select count(*)from public.nexora_food_user_roles where role='super_admin')=1 then begin perform public.nexora_food_admin_access((select admin from food_fixture),'super_admin','revoke',null,'test last admin');raise exception 'Last admin removal allowed';exception when others then if sqlerrm='Last admin removal allowed'then raise;end if;end;end if;end$$;
select set_config('request.jwt.claim.sub',(select customer::text from food_fixture),true);
update food_fixture set quote=public.nexora_food_quote_cart(restaurant,jsonb_build_array(jsonb_build_object('item_id',dish,'quantity',2)),address,null,0);
update food_fixture set ordered=public.nexora_food_place_order(restaurant,jsonb_build_array(jsonb_build_object('item_id',dish,'quantity',2)),address,null,0,'food-test-checkout-key','cod',(quote->>'quote_id')::uuid);

-- Customer cannot inspect operational data or mutate another kitchen.
do $$begin
 begin perform public.nexora_food_operations_snapshot('admin');raise exception 'customer admin escalation';exception when others then if sqlerrm='customer admin escalation'then raise;end if;end;
 if exists(select 1 from public.nexora_food_restaurant_earnings)then raise exception 'customer earnings leak';end if;
 begin perform public.nexora_food_operations_action('kitchen',jsonb_build_object('restaurant_id',(select restaurant from food_fixture),'minutes',30,'paused',true));raise exception 'customer kitchen edit';exception when others then if sqlerrm='customer kitchen edit'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
select public.nexora_food_operations_action('kitchen',jsonb_build_object('restaurant_id',restaurant,'minutes',35,'paused',false))from food_fixture;
select public.nexora_food_transition_order((ordered->>'id')::uuid,'confirmed')from food_fixture;
select public.nexora_food_transition_order((ordered->>'id')::uuid,'preparing')from food_fixture;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_operations_action('commission',jsonb_build_object('restaurant_id',restaurant,'bps',1000,'reason','Test next-order pricing'))from food_fixture;
select public.nexora_food_operations_action('rider_pay','{"paise":5000,"reason":"Test dispatch pay"}')from food_fixture;
-- Online check is server-enforced.
do $$begin begin perform public.nexora_food_operations_action('dispatch',jsonb_build_object('order_id',(select ordered->>'id'from food_fixture),'partner_id',(select rider from food_fixture),'reason','Offline rider test'));raise exception 'offline dispatch accepted';exception when others then if sqlerrm='offline dispatch accepted'then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
select public.nexora_food_operations_action('rider_online','{"online":true}');
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_operations_action('dispatch',jsonb_build_object('order_id',ordered->>'id','partner_id',rider,'reason','Test dispatch'))from food_fixture;
select public.nexora_food_operations_action('rider_pay','{"paise":6000,"reason":"Future dispatch pay"}');
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','declined'))from food_fixture;
do $$begin if exists(select 1 from public.nexora_food_orders)then raise exception 'Declined rider retained customer address access';end if;end$$;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_operations_action('rider_pay','{"paise":5000,"reason":"Test dispatch retry"}');
select public.nexora_food_operations_action('dispatch',jsonb_build_object('order_id',ordered->>'id','partner_id',rider,'reason','Test redispatch'))from food_fixture;
select public.nexora_food_operations_action('rider_pay','{"paise":6000,"reason":"Future dispatch pay"}');
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
do $$begin begin perform public.nexora_food_transition_order((select(ordered->>'id')::uuid from food_fixture),'out_for_delivery');raise exception 'rider bypass allowed';exception when others then if sqlerrm='rider bypass allowed'then raise;end if;end;end$$;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','accepted'))from food_fixture;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','reached_restaurant'))from food_fixture;
do $$begin begin perform public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',(select ordered->>'id'from food_fixture),'stage','picked_up'));raise exception 'premature pickup allowed';exception when others then if sqlerrm='premature pickup allowed'then raise;end if;end;end$$;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
select public.nexora_food_transition_order((ordered->>'id')::uuid,'ready_for_pickup')from food_fixture;
select set_config('request.jwt.claim.sub',(select rider::text from food_fixture),true);
do $$begin begin perform public.nexora_food_transition_order((select(ordered->>'id')::uuid from food_fixture),'out_for_delivery');raise exception 'ready-order rider bypass allowed';exception when others then if sqlerrm='ready-order rider bypass allowed'then raise;end if;end;end$$;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','picked_up'))from food_fixture;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','out_for_delivery'))from food_fixture;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','delivered'))from food_fixture;
select public.nexora_food_operations_action('rider_stage',jsonb_build_object('order_id',ordered->>'id','stage','delivered'))from food_fixture;
do $$begin
 if(select count(*)from public.nexora_food_rider_earnings)<>1 then raise exception 'Rider earnings duplicate or missing';end if;
 if not exists(select 1 from public.nexora_food_rider_earnings where delivery_paise=5000)then raise exception 'Dispatch pay snapshot changed';end if;
 if exists(select 1 from public.nexora_food_restaurant_earnings)then raise exception 'rider restaurant earnings leak';end if;
end$$;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
do $$begin
 if not exists(select 1 from public.nexora_food_restaurant_earnings where state='earned'and commission_bps=0 and net_paise=50000)then raise exception 'Order commission snapshot changed';end if;
 if(public.nexora_food_operations_snapshot('restaurant',(select restaurant from food_fixture))->'metrics'->>'orders')::integer<>1 then raise exception 'Kitchen snapshot incorrect';end if;
 begin update public.nexora_food_restaurant_earnings set net_paise=1;raise exception 'ledger tampering allowed';exception when insufficient_privilege then null;end;
end$$;
-- Private uploaded-object fixture; no production file is created.
reset role;
insert into storage.objects(bucket_id,name,owner,metadata)select 'nexora-food-documents',restaurant::text||'/test-fssai.png',owner,'{"mimetype":"image/png","size":512}'::jsonb from food_fixture;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select owner::text from food_fixture),true);
select public.nexora_food_operations_action('document_submit',jsonb_build_object('restaurant_id',restaurant,'kind','fssai','path',restaurant::text||'/test-fssai.png'))from food_fixture;
select set_config('request.jwt.claim.sub',(select admin::text from food_fixture),true);
select public.nexora_food_operations_action('document_review',jsonb_build_object('id',d.id,'status','approved','reason','Verified test document'))from public.nexora_food_restaurant_documents d where d.restaurant_id=(select restaurant from food_fixture);
select public.nexora_food_operations_action('verify_restaurant',jsonb_build_object('restaurant_id',restaurant,'status','active','reason','Verified test restaurant'))from food_fixture;
select public.nexora_food_operations_action('settlement_create',jsonb_build_object('restaurant_id',restaurant,'reason','Test reconciliation'))from food_fixture;
do $$begin
 begin perform public.nexora_food_operations_action('settlement_create',jsonb_build_object('restaurant_id',(select restaurant from food_fixture),'reason','Duplicate batch'));raise exception 'duplicate settlement allowed';exception when others then if sqlerrm='duplicate settlement allowed'then raise;end if;end;
 if not exists(select 1 from public.nexora_food_restaurant_settlements where restaurant_id=(select restaurant from food_fixture)and net_payable_paise=50000)then raise exception 'Settlement totals incorrect';end if;
end$$;
select public.nexora_food_operations_action('settlement_status',jsonb_build_object('id',s.id,'status','approved','reason','Reconciled test batch'))from public.nexora_food_restaurant_settlements s where s.restaurant_id=(select restaurant from food_fixture);
select public.nexora_food_operations_action('settlement_status',jsonb_build_object('id',s.id,'status','paid','reason','TEST-BANK-REFERENCE'))from public.nexora_food_restaurant_settlements s where s.restaurant_id=(select restaurant from food_fixture);
reset role;
rollback;
select 'PASS: role isolation, online dispatch, decline revocation, pickup lifecycle, earnings idempotence, immutable commission/pay snapshots, private documents, settlement reconciliation; all fixtures rolled back' as operations_integration;
