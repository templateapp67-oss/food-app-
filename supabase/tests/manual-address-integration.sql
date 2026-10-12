begin;
create temporary table manual_address_fixture(customer uuid,other_user uuid,restaurant uuid,address uuid);
insert into manual_address_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),null;
grant all on manual_address_fixture to authenticated;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','manual-address-qa-'||id||'@example.invalid','{"full_name":"Manual address QA"}','{}',now(),now(),now()
from manual_address_fixture cross join lateral(values(customer),(other_user))f(id);
insert into public.nexora_food_restaurants(id,name,slug,address,city,location,status)
select restaurant,'Manual address QA kitchen',restaurant::text,'Jhotwara, Jaipur','Jaipur',extensions.ST_SetSRID(extensions.ST_MakePoint(75.735,26.956),4326)::extensions.geography,'active' from manual_address_fixture;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select customer::text from manual_address_fixture),true);
update manual_address_fixture set address=public.nexora_food_save_address('{"type":"home","line1":"118 Durga Vihar D","locality":"Jhotwara","pincode":"302012"}');
do $$begin
 if not exists(select 1 from public.nexora_food_user_addresses where id=(select address from manual_address_fixture) and user_id=auth.uid() and latitude is null and longitude is null and location is null) then raise exception 'Manual address did not persist without GPS';end if;
 begin perform public.nexora_food_quote_cart((select restaurant from manual_address_fixture),'[{"item_id":"00000000-0000-4000-8000-000000000001","quantity":1}]',(select address from manual_address_fixture));raise exception 'Unconfirmed delivery pin accepted at checkout';exception when others then if sqlerrm<>'Choose a valid delivery address' then raise;end if;end;
 begin perform public.nexora_food_save_address('{"type":"home","line1":"118 Durga Vihar D","locality":"Jhotwara","pincode":"302012","latitude":26.956}');raise exception 'Half coordinate accepted';exception when others then if sqlerrm='Half coordinate accepted' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select other_user::text from manual_address_fixture),true);
do $$begin
 begin perform public.nexora_food_confirm_address_pin((select address from manual_address_fixture),26.956,75.735);raise exception 'Another customer changed address pin';exception when others then if sqlerrm<>'Saved address not found for this account' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select customer::text from manual_address_fixture),true);
select public.nexora_food_confirm_address_pin((select address from manual_address_fixture),26.956,75.735);
do $$begin
 if not exists(select 1 from public.nexora_food_user_addresses where id=(select address from manual_address_fixture) and latitude=26.956 and longitude=75.735 and location is not null) then raise exception 'Confirmed pin did not persist';end if;
end$$;
select 'PASS: manual address save, pin confirmation, ownership, checkout guard' as result;
rollback;
