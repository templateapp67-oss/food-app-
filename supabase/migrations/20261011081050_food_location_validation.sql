-- Additive Food-only validation; existing projects remain untouched.
alter table public.nexora_food_restaurants
 add column latitude double precision generated always as (extensions.ST_Y(location::extensions.geometry)) stored,
 add column longitude double precision generated always as (extensions.ST_X(location::extensions.geometry)) stored,
 add constraint nexora_food_restaurant_launch_bounds check(extensions.ST_Y(location::extensions.geometry) between 26.5 and 27.4 and extensions.ST_X(location::extensions.geometry) between 75.3 and 76.3);
alter table public.nexora_food_user_addresses add constraint nexora_food_address_launch_bounds check(latitude between 26.5 and 27.4 and longitude between 75.3 and 76.3);
create or replace function nexora_food_private.nexora_food_save_address(p_address jsonb) returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare aid uuid:=gen_random_uuid();lat numeric:=(p_address->>'latitude')::numeric;lng numeric:=(p_address->>'longitude')::numeric;begin
 if auth.uid()is null then raise exception 'Sign in required';end if;
 if lat is null or lng is null or lat not between 26.5 and 27.4 or lng not between 75.3 and 76.3 then raise exception 'Choose coordinates in the Jaipur launch area';end if;
 if not exists(select 1 from public.nexora_food_locations where is_active and locality=trim(p_address->>'locality'))then raise exception 'Choose a supported Jaipur locality';end if;
 if p_address->>'pincode'!~'^302[0-9]{3}$'or p_address->>'pincode'is null then raise exception 'Enter a Jaipur postal code';end if;
 if coalesce(length(trim(p_address->>'line1')),0)<5 then raise exception 'Enter a complete street address';end if;
 insert into public.nexora_food_user_addresses(id,user_id,type,line1,line2,landmark,locality,city,state,pincode,latitude,longitude,location,is_default)
 values(aid,auth.uid(),coalesce(p_address->>'type','home'),trim(p_address->>'line1'),p_address->>'line2',p_address->>'landmark',trim(p_address->>'locality'),'Jaipur','Rajasthan',p_address->>'pincode',lat,lng,extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography,not exists(select 1 from public.nexora_food_user_addresses where user_id=auth.uid()and deleted_at is null));return aid;
end$$;
-- Validate folder names before casting, including when the planner reorders predicates.
create function nexora_food_private.image_member(p_name text)returns boolean language sql stable security definer set search_path=public as $$
 select case when split_part(p_name,'/',1)~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'then nexora_food_private.nexora_member(split_part(p_name,'/',1)::uuid)or nexora_food_private.nexora_is_admin()else false end
$$;
revoke all on function nexora_food_private.image_member(text)from public,anon;
grant execute on function nexora_food_private.image_member(text)to authenticated,service_role;
alter policy nexora_food_images_insert on storage.objects with check(bucket_id in('nexora-food-restaurants','nexora-food-menu')and nexora_food_private.image_member(name));
alter policy nexora_food_images_update on storage.objects using(bucket_id in('nexora-food-restaurants','nexora-food-menu')and nexora_food_private.image_member(name))with check(bucket_id in('nexora-food-restaurants','nexora-food-menu')and nexora_food_private.image_member(name));
alter policy nexora_food_images_delete on storage.objects using(bucket_id in('nexora-food-restaurants','nexora-food-menu')and nexora_food_private.image_member(name));
-- The scheduler calls only Food expiry; it does not alter other scheduled jobs.
create extension if not exists pg_cron;
select cron.schedule('nexora-food-expire-orders','* * * * *','select public.nexora_food_expire_orders();');
