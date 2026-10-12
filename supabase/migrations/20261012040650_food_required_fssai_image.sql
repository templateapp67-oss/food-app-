-- Enforce real FSSAI image uploads and verified approval on all activation routes.
create function nexora_food_private.validate_fssai_image()returns trigger language plpgsql security definer set search_path=''as $$
begin
 if new.kind='fssai'and not exists(select 1 from storage.objects o where o.bucket_id='nexora-food-documents'and o.name=new.storage_path and split_part(o.name,'/',1)=new.restaurant_id::text and o.metadata->>'mimetype'in('image/png','image/jpeg')and coalesce((o.metadata->>'size')::numeric,0)between 1 and 10485760 and o.name~*'\.(png|jpe?g)$')then raise exception 'FSSAI requires an uploaded JPG or PNG image up to 10 MB. PDF or missing files cannot be submitted or approved.';end if;
 return new;
end$$;
revoke all on function nexora_food_private.validate_fssai_image()from public,anon,authenticated;
create trigger required_fssai_image before insert or update of kind,storage_path,status on public.nexora_food_restaurant_documents for each row execute function nexora_food_private.validate_fssai_image();
-- Admins may upload genuine certificates on behalf of an existing restaurant.
drop policy food_documents_storage_insert on storage.objects;
create policy food_documents_storage_insert on storage.objects for insert to authenticated with check(bucket_id='nexora-food-documents'and(nexora_food_private.image_member(name)or(nexora_food_private.nexora_is_admin()and exists(select 1 from public.nexora_food_restaurants r where r.id::text=split_part(name,'/',1)))));
drop policy food_documents_storage_delete on storage.objects;
create policy food_documents_storage_delete on storage.objects for delete to authenticated using(bucket_id='nexora-food-documents'and(nexora_food_private.image_member(name)or(nexora_food_private.nexora_is_admin()and exists(select 1 from public.nexora_food_restaurants r where r.id::text=split_part(name,'/',1))))and not exists(select 1 from public.nexora_food_restaurant_documents d where d.storage_path=name));
do $$declare def text;begin
 select pg_get_functiondef('nexora_food_private.food_ops_action(text,jsonb)'::regprocedure)into def;
 if position('if not nexora_food_private.nexora_member(rid)then raise exception ''Restaurant access required'''in def)=0 then raise exception 'Document submit guard not found';end if;
 def:=replace(def,'if not nexora_food_private.nexora_member(rid)then raise exception ''Restaurant access required''','if not(nexora_food_private.nexora_member(rid)or nexora_food_private.nexora_is_admin())then raise exception ''Restaurant access required''');execute def;
end$$;
create or replace function nexora_food_private.nexora_food_admin_restaurant_status(p_restaurant uuid,p_status text,p_reason text)returns void language plpgsql security definer set search_path=''as $$
declare previous text;reason text:=trim(p_reason);
begin
 if not nexora_food_private.nexora_is_admin()then raise exception 'Admin access required';end if;
 if reason is null or length(reason)not between 3 and 2000 then raise exception 'Enter a reason between 3 and 2000 characters';end if;
 if p_status is null or p_status not in('pending','under_review','active','suspended','inactive','rejected')then raise exception 'Invalid restaurant status';end if;
 select status into previous from public.nexora_food_restaurants where id=p_restaurant for update;
 if not found then raise exception 'Restaurant not found';end if;
 if p_status='rejected'and previous not in('pending','under_review')then raise exception 'Only pending or under-review applications can be rejected';end if;
 if p_status='active'and not exists(select 1 from public.nexora_food_restaurant_documents d join storage.objects o on o.bucket_id='nexora-food-documents'and o.name=d.storage_path where d.restaurant_id=p_restaurant and d.kind='fssai'and d.status='approved'and o.metadata->>'mimetype'in('image/png','image/jpeg')and coalesce((o.metadata->>'size')::numeric,0)>0 and d.storage_path~*'\.(png|jpe?g)$')then raise exception 'FSSAI certificate image is required. Upload a JPG/PNG and approve the document before restaurant activation.';end if;
 update public.nexora_food_restaurants set status=p_status,rejection_reason=case when p_status='rejected'then reason else null end,decision_reason=reason,decided_at=now()where id=p_restaurant;
 insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,before,after,reason)values(auth.uid(),'restaurant-status','restaurants',p_restaurant::text,jsonb_build_object('status',previous),jsonb_build_object('status',p_status),reason);
end$$;
