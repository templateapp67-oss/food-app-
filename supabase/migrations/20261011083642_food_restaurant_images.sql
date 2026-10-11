create function nexora_food_private.nexora_food_save_images(p_restaurant uuid,p_cover text,p_gallery text[],p_menu_pages text[])returns void language plpgsql security definer set search_path=public as $$declare url text;begin
 if auth.uid()is null or not(nexora_food_private.nexora_member(p_restaurant)or nexora_food_private.nexora_is_admin())then raise exception 'Restaurant access required';end if;
 if coalesce(cardinality(p_gallery),0)>20 or coalesce(cardinality(p_menu_pages),0)>20 then raise exception 'Maximum 20 photos or menu pages';end if;
 for url in select unnest(array[p_cover]||coalesce(p_gallery,'{}')||coalesce(p_menu_pages,'{}'))loop if url is not null and(url!~'^https://'or length(url)>2000)then raise exception 'Image URLs must use HTTPS';end if;end loop;
 update public.nexora_food_restaurants set cover_url=p_cover,gallery_urls=coalesce(p_gallery,'{}'),menu_pages=coalesce(p_menu_pages,'{}')where id=p_restaurant;if not found then raise exception 'Restaurant not found';end if;
end$$;
revoke all on function nexora_food_private.nexora_food_save_images(uuid,text,text[],text[])from public,anon;
grant execute on function nexora_food_private.nexora_food_save_images(uuid,text,text[],text[])to authenticated,service_role;
create function public.nexora_food_save_images(p_restaurant uuid,p_cover text,p_gallery text[],p_menu_pages text[])returns void language sql security invoker set search_path=public as $$select nexora_food_private.nexora_food_save_images(p_restaurant,p_cover,p_gallery,p_menu_pages)$$;
revoke all on function public.nexora_food_save_images(uuid,text,text[],text[])from public,anon;
grant execute on function public.nexora_food_save_images(uuid,text,text[],text[])to authenticated,service_role;
