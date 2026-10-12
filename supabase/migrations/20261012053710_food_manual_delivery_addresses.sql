-- A text address can be saved without GPS. NULL location keeps live checkout blocked
-- by the existing nexora_compute guard until the customer confirms a delivery pin.
create or replace function nexora_food_private.nexora_food_save_address(p_address jsonb)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare aid uuid:=gen_random_uuid();lat numeric:=nullif(p_address->>'latitude','')::numeric;lng numeric:=nullif(p_address->>'longitude','')::numeric;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if (lat is null)<>(lng is null) then raise exception 'Provide both delivery coordinates or leave both blank';end if;
 if lat is not null and (lat not between 26.5 and 27.4 or lng not between 75.3 and 76.3) then raise exception 'Choose a delivery pin inside Jaipur';end if;
 if not exists(select 1 from public.nexora_food_locations where is_active and locality=trim(p_address->>'locality')) then raise exception 'Choose a supported Jaipur locality';end if;
 if coalesce(p_address->>'pincode','')!~'^30[23][0-9]{3}$' then raise exception 'Enter a Jaipur postal code';end if;
 if coalesce(length(trim(p_address->>'line1')),0) not between 5 and 200 then raise exception 'Enter a complete house and street address (5–200 characters)';end if;
 insert into public.nexora_food_user_addresses(id,user_id,type,line1,line2,landmark,locality,city,state,pincode,latitude,longitude,location,is_default)
 values(aid,auth.uid(),coalesce(p_address->>'type','home'),trim(p_address->>'line1'),p_address->>'line2',p_address->>'landmark',trim(p_address->>'locality'),'Jaipur','Rajasthan',p_address->>'pincode',lat,lng,
 case when lat is null then null else extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography end,
 not exists(select 1 from public.nexora_food_user_addresses where user_id=auth.uid() and deleted_at is null));return aid;
end$$;
create or replace function nexora_food_private.confirm_address_pin(p_address uuid,p_lat numeric,p_lng numeric)
returns void language plpgsql security definer set search_path=public,extensions as $$
begin
 if auth.uid() is null then raise exception 'Sign in required';end if;
 if p_lat is null or p_lng is null or p_lat not between 26.5 and 27.4 or p_lng not between 75.3 and 76.3 then raise exception 'Choose your delivery pin inside Jaipur';end if;
 update public.nexora_food_user_addresses set latitude=p_lat,longitude=p_lng,location=extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng,p_lat),4326)::extensions.geography
 where id=p_address and user_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Saved address not found for this account';end if;
end$$;
create or replace function public.nexora_food_confirm_address_pin(p_address uuid,p_lat numeric,p_lng numeric)
returns void language sql security invoker set search_path=public as $$select nexora_food_private.confirm_address_pin(p_address,p_lat,p_lng)$$;
revoke all on function nexora_food_private.confirm_address_pin(uuid,numeric,numeric),public.nexora_food_confirm_address_pin(uuid,numeric,numeric) from public,anon;
grant execute on function nexora_food_private.confirm_address_pin(uuid,numeric,numeric),public.nexora_food_confirm_address_pin(uuid,numeric,numeric) to authenticated;
