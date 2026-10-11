-- Food-only application additions; appended to shared-food-backend.sql before initial deployment.
alter table public.nexora_food_restaurants add column cuisines text[] not null default '{}',
 add column gallery_urls text[] not null default '{}',add column menu_pages text[] not null default '{}',
 add column amenities text[] not null default '{}',add column dining_type text,
 add column booking_offer jsonb,add column bank_offer jsonb,add column promo_offer jsonb,
 add column special_tags jsonb not null default '[]',add column dining_offers jsonb not null default '[]',
 add constraint nexora_food_jaipur_restaurant check(lower(trim(city))='jaipur');
alter table public.nexora_food_user_addresses add constraint nexora_food_jaipur_address check(lower(trim(city))='jaipur' and lower(trim(state))='rajasthan');
create table public.nexora_food_locations(id uuid primary key default gen_random_uuid(),city text not null default 'Jaipur' check(city='Jaipur'),state text not null default 'Rajasthan',locality text not null unique,is_active boolean not null default true);
alter table public.nexora_food_locations enable row level security;
grant select on public.nexora_food_locations to anon,authenticated;
grant all on public.nexora_food_locations to service_role;
create policy food_locations_read on public.nexora_food_locations for select to anon,authenticated using(is_active);
insert into public.nexora_food_locations(locality) select unnest(array['C Scheme','Malviya Nagar','Vaishali Nagar','Mansarovar','Raja Park','Tonk Road','Jagatpura','Pratap Nagar','Sanganer','Civil Lines','Bani Park','Vidhyadhar Nagar','Shastri Nagar','Jhotwara','Sodala','Ajmer Road','Adarsh Nagar','Jawahar Nagar']);
insert into public.nexora_food_food_categories(name,sort_order)select name,ord from unnest(array['Biryani','Pizza','Burgers','South Indian','North Indian','Healthy','Desserts'])with ordinality a(name,ord);
insert into public.nexora_food_app_settings(key,value)values('cod.enabled','true'),('cod.max_paise','1000000'),('payments.online_enabled','false'),('delivery.flat_paise','2900'),('tax.bps','0'),('loyalty.earn_per_paise','10000'),('loyalty.redeem_paise_per_100_points','10000')on conflict(key)do nothing;
insert into public.nexora_food_profiles(id,email,phone,full_name)select id,email,phone,left(coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name',''),120)from auth.users on conflict(id)do nothing;
insert into public.nexora_food_user_roles(user_id,role)select id,'customer'from auth.users on conflict do nothing;
insert into public.nexora_food_loyalty_accounts(user_id)select id from auth.users on conflict do nothing;
-- Bootstrap only the Site owner's existing verified account, without changing salon roles.
insert into public.nexora_food_user_roles(user_id,role)select id,'super_admin'from auth.users where lower(email)='templateapp67@gmail.com' and email_confirmed_at is not null on conflict do nothing;
insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,reason)select u.id,'bootstrap-super-admin','nexora_food_user_roles',u.id::text,'Initialize Food administration for the existing Site owner'from auth.users u join public.nexora_food_user_roles r on r.user_id=u.id and r.role='super_admin';

create function public.nexora_food_ensure_account()returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid()is null then raise exception 'Sign in required';end if;
 insert into public.nexora_food_profiles(id,email,phone,full_name)select id,email,phone,left(coalesce(raw_user_meta_data->>'full_name',''),120)from auth.users where id=auth.uid()on conflict(id)do nothing;
 insert into public.nexora_food_user_roles(user_id,role)values(auth.uid(),'customer')on conflict do nothing;
 insert into public.nexora_food_loyalty_accounts(user_id)values(auth.uid())on conflict do nothing;
end$$;

create function public.nexora_food_save_account(p_name text,p_phone text,p_avatar text default null)returns void language plpgsql security definer set search_path=public as $$begin
 perform public.nexora_food_ensure_account();
 if p_name is null or length(trim(p_name))not between 1 and 120 then raise exception 'Enter a name between 1 and 120 characters';end if;
 if coalesce(p_phone,'')<>''and p_phone!~'^\+?[0-9]{10,15}$'then raise exception 'Invalid phone number';end if;
 if coalesce(p_avatar,'')<>''and p_avatar!~('^'||auth.uid()::text||'/[a-zA-Z0-9._-]+$')then raise exception 'Avatar must belong to your account';end if;
 update public.nexora_food_profiles set full_name=trim(p_name),phone=nullif(p_phone,''),avatar_url=coalesce(nullif(p_avatar,''),avatar_url)where id=auth.uid();
end$$;

create function public.nexora_food_apply_restaurant(p_data jsonb)returns uuid language plpgsql security definer set search_path=public,extensions as $$declare rid uuid;lat numeric:=(p_data->>'latitude')::numeric;lng numeric:=(p_data->>'longitude')::numeric;begin
 perform public.nexora_food_ensure_account();
 if exists(select 1 from public.nexora_food_profiles where id=auth.uid()and is_blocked)then raise exception 'Account blocked';end if;
 if p_data->>'slug'is null or p_data->>'slug'!~'^[a-z0-9]+(-[a-z0-9]+)*$'then raise exception 'Invalid URL slug';end if;
 if lat is null or lng is null or lat not between 26.5 and 27.4 or lng not between 75.3 and 76.3 then raise exception 'Choose a location in the Jaipur launch area';end if;
 if(select count(*)from public.nexora_food_restaurant_members where user_id=auth.uid()and role='owner')>=5 then raise exception 'Restaurant application limit reached';end if;
 insert into public.nexora_food_restaurants(name,slug,address,city,location,phone,description)values(trim(p_data->>'name'),p_data->>'slug',trim(p_data->>'address'),'Jaipur',extensions.ST_SetSRID(extensions.ST_MakePoint(lng,lat),4326)::extensions.geography,p_data->>'phone',p_data->>'description')returning id into rid;
 insert into public.nexora_food_restaurant_members(restaurant_id,user_id,role)values(rid,auth.uid(),'owner');
 insert into public.nexora_food_user_roles(user_id,role)values(auth.uid(),'restaurant_owner')on conflict do nothing;
 return rid;
end$$;

create or replace function public.nexora_food_admin_role(p_user uuid,p_role text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin
 if not nexora_food_private.nexora_is_super_admin()then raise exception 'Super Admin required';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason required';end if;
 if not exists(select 1 from public.nexora_food_profiles where id=p_user)then raise exception 'Food account not found';end if;
 insert into public.nexora_food_user_roles(user_id,role)values(p_user,p_role::public.nexora_food_app_role)on conflict do nothing;
 if p_role='rider'then insert into public.nexora_food_delivery_partners(user_id,name,phone)select id,coalesce(nullif(full_name,''),'Rider'),phone from public.nexora_food_profiles where id=p_user on conflict(user_id)do update set is_active=true;end if;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'grant-role','user_roles',p_user::text,jsonb_build_object('role',p_role),p_reason);
end$$;
create function public.nexora_food_admin_member(p_restaurant uuid,p_user uuid,p_role text,p_reason text)returns void language plpgsql security definer set search_path=public as $$begin
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin required';end if;
 if p_role not in('owner','staff')or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Invalid membership';end if;
 insert into public.nexora_food_restaurant_members(restaurant_id,user_id,role)values(p_restaurant,p_user,p_role)on conflict(restaurant_id,user_id)do update set role=excluded.role;
 insert into public.nexora_food_user_roles(user_id,role)values(p_user,case when p_role='owner'then 'restaurant_owner'::public.nexora_food_app_role else 'restaurant_staff'::public.nexora_food_app_role end)on conflict do nothing;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,after,reason)values(auth.uid(),'assign-member','restaurant_members',p_restaurant::text,jsonb_build_object('user',p_user,'role',p_role),p_reason);
end$$;

create function public.nexora_food_save_listing(p_restaurant uuid,p_changes jsonb)returns void language plpgsql security definer set search_path=public as $$declare u text;begin
 if auth.uid()is null or not(nexora_food_private.nexora_member(p_restaurant)or nexora_food_private.nexora_is_admin())then raise exception 'Access denied';end if;
 if coalesce(p_changes->>'cover_url','')<>'' and p_changes->>'cover_url'!~'^https://'then raise exception 'Image URL must use HTTPS';end if;
 for u in select jsonb_array_elements_text(coalesce(p_changes->'gallery_urls','[]')) union all select jsonb_array_elements_text(coalesce(p_changes->'menu_pages','[]'))loop if u!~'^https://'then raise exception 'Photo URL must use HTTPS';end if;end loop;
 update public.nexora_food_restaurants set phone=left(p_changes->>'phone',30),description=left(p_changes->>'description',2000),prep_time_min=(p_changes->>'prep_time_min')::integer,is_temporarily_closed=(p_changes->>'is_temporarily_closed')::boolean,cover_url=nullif(p_changes->>'cover_url',''),cuisines=array(select jsonb_array_elements_text(coalesce(p_changes->'cuisines','[]'))),gallery_urls=array(select jsonb_array_elements_text(coalesce(p_changes->'gallery_urls','[]'))),menu_pages=array(select jsonb_array_elements_text(coalesce(p_changes->'menu_pages','[]'))),amenities=array(select jsonb_array_elements_text(coalesce(p_changes->'amenities','[]'))),avg_cost_for_two_paise=(p_changes->>'avg_cost_for_two_paise')::bigint,dining_type=nullif(p_changes->>'dining_type','')where id=p_restaurant;
end$$;

create function public.nexora_food_submit_rider_application(p_name text,p_phone text)returns void language plpgsql security definer set search_path=public as $$begin
 perform public.nexora_food_ensure_account();
 if p_name is null or length(trim(p_name))not between 1 and 120 or p_phone is null or p_phone!~'^\+?[0-9]{10,15}$'then raise exception 'Enter a valid rider name and phone';end if;
 insert into public.nexora_food_delivery_partners(user_id,name,phone,is_active)values(auth.uid(),trim(p_name),p_phone,false)on conflict(user_id)do update set name=excluded.name,phone=excluded.phone;
end$$;
create function public.nexora_food_rider_location(p_order uuid,p_lat numeric,p_lng numeric)returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid()is null or not exists(select 1 from public.nexora_food_delivery_assignments where order_id=p_order and partner_id=auth.uid())then raise exception 'Assigned rider required';end if;
 if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Invalid coordinates';end if;
 update public.nexora_food_delivery_assignments set last_latitude=p_lat,last_longitude=p_lng,location_updated_at=now()where order_id=p_order;
end$$;
alter table public.nexora_food_delivery_assignments add column last_latitude numeric,add column last_longitude numeric,add column location_updated_at timestamptz;

create function public.nexora_food_submit_item_review(p_order_item uuid,p_rating integer,p_body text)returns uuid language plpgsql security definer set search_path=public as $$declare i public.nexora_food_order_items;o public.nexora_food_orders;rid uuid;begin
 select *into i from public.nexora_food_order_items where id=p_order_item;select *into o from public.nexora_food_orders where id=i.order_id and user_id=auth.uid();
 if not found or o.status<>'delivered' or o.delivered_at<now()-interval '14 days'then raise exception 'Only eligible delivered dishes can be reviewed';end if;
 insert into public.nexora_food_food_item_reviews(user_id,menu_item_id,order_item_id,rating,body)values(auth.uid(),i.menu_item_id,i.id,p_rating,left(p_body,2000))on conflict(order_item_id)do update set rating=excluded.rating,body=excluded.body returning id into rid;
 update public.nexora_food_menu_items set rating_avg=(select round(avg(rating)::numeric,2)from public.nexora_food_food_item_reviews where menu_item_id=i.menu_item_id and status='visible'),rating_count=(select count(*)from public.nexora_food_food_item_reviews where menu_item_id=i.menu_item_id and status='visible')where id=i.menu_item_id;return rid;
end$$;
-- Efficient foreign-key lookups for Food RLS and operational dashboards.
create index nexora_food_assignments_partner on public.nexora_food_delivery_assignments(partner_id);
create index nexora_food_reviews_restaurant on public.nexora_food_restaurant_reviews(restaurant_id,created_at desc);
create index nexora_food_food_reviews_item on public.nexora_food_food_item_reviews(menu_item_id);
create index nexora_food_history_order on public.nexora_food_order_status_history(order_id,created_at);
create index nexora_food_notifications_user on public.nexora_food_user_notifications(user_id,created_at desc);
create index nexora_food_support_user on public.nexora_food_support_tickets(user_id);
create index nexora_food_ledger_user on public.nexora_food_loyalty_ledger(user_id,created_at desc);
create policy food_payment_read on public.nexora_food_payments for select to authenticated using(nexora_food_private.nexora_is_admin()or exists(select 1 from public.nexora_food_orders where id=order_id and user_id=auth.uid()));
create policy food_refund_read on public.nexora_food_refunds for select to authenticated using(nexora_food_private.nexora_is_admin()or exists(select 1 from public.nexora_food_orders where id=order_id and user_id=auth.uid()));
create policy food_redemption_read on public.nexora_food_coupon_redemptions for select to authenticated using(user_id=auth.uid()or nexora_food_private.nexora_is_admin());
create policy food_search_read on public.nexora_food_search_history for select to authenticated using(user_id=auth.uid());
-- Explicit permissions only for the newly introduced Food endpoints.
do $$declare f record;begin for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname in('nexora_food_ensure_account','nexora_food_save_account','nexora_food_apply_restaurant','nexora_food_admin_member','nexora_food_save_listing','nexora_food_submit_rider_application','nexora_food_rider_location','nexora_food_submit_item_review')loop execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated,service_role',f.signature);end loop;end$$;
