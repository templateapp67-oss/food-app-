-- Use a literal plus character; the previous double-escaped regex rejected all normal phones.
create or replace function nexora_food_private.nexora_food_save_account(p_name text,p_phone text,p_avatar text default null)
returns void language plpgsql security definer set search_path=public as $$begin
 perform public.nexora_food_ensure_account();
 if p_name is null or length(trim(p_name)) not between 1 and 120 then raise exception 'Enter a name between 1 and 120 characters';end if;
 if coalesce(p_phone,'')<>'' and p_phone !~ '^[+]?[0-9]{10,15}$' then raise exception 'Invalid phone number';end if;
 if coalesce(p_avatar,'')<>'' and p_avatar !~ ('^'||auth.uid()::text||'/[a-zA-Z0-9._-]+$') then raise exception 'Avatar must belong to your account';end if;
 update public.nexora_food_profiles set full_name=trim(p_name),phone=nullif(p_phone,''),avatar_url=coalesce(nullif(p_avatar,''),avatar_url) where id=auth.uid();
end$$;
