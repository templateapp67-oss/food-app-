begin;
set local statement_timeout='15s';
create temporary table role_fixture(customer uuid,partner uuid,rider uuid,requester uuid,admin uuid);
insert into role_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
grant select on role_fixture to authenticated;
insert into auth.users(id,instance_id,aud,role,email,raw_user_meta_data,raw_app_meta_data,created_at,updated_at,email_confirmed_at)
select id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','roles-qa-'||id||'@example.invalid',jsonb_build_object('full_name','Roles QA','registration_workspace',workspace),'{}',now(),now(),now()
from role_fixture cross join lateral(values(customer,'customer'),(partner,'restaurant'),(rider,'rider'),(requester,'admin'),(admin,'customer'))f(id,workspace);
insert into public.nexora_food_user_roles(user_id,role)select admin,'super_admin'from role_fixture;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select requester::text from role_fixture),true);
do $$declare c jsonb;begin
 c:=public.nexora_food_workspace_context();
 if c->>'workspace'<>'admin'or(c->>'ready')::boolean then raise exception 'Admin request elevated itself';end if;
 if exists(select 1 from public.nexora_food_user_roles where user_id=auth.uid()and role in('admin','super_admin'))then raise exception 'Metadata granted privileged role';end if;
 begin perform public.nexora_food_workspace_requests();raise exception 'Request queue leaked';exception when others then if sqlerrm='Request queue leaked'then raise;end if;end;
 begin perform public.nexora_food_approve_workspace(auth.uid(),'Self approval');raise exception 'Self approval allowed';exception when others then if sqlerrm='Self approval allowed'then raise;end if;end;
 begin update public.nexora_food_profiles set registration_workspace='admin'where id=auth.uid();raise exception 'Direct profile mutation allowed';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',(select partner::text from role_fixture),true);
do $$declare c jsonb;begin
 c:=public.nexora_food_workspace_context();
 if c->>'path'<>'/restaurant'or(c->>'ready')::boolean then raise exception 'Partner onboarding route incorrect';end if;
 if not exists(select 1 from public.nexora_food_user_roles where user_id=auth.uid()and role='restaurant_owner')then raise exception 'Partner role not saved';end if;
 begin perform public.nexora_food_operations_snapshot('admin');raise exception 'Partner admin bypass';exception when others then if sqlerrm='Partner admin bypass'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select rider::text from role_fixture),true);
do $$declare c jsonb;begin
 c:=public.nexora_food_workspace_context();
 if c->>'path'<>'/rider'or(c->>'ready')::boolean then raise exception 'Rider bypassed approval';end if;
 perform public.nexora_food_submit_rider_application('Rider QA','9876543210');
 c:=public.nexora_food_workspace_context();if not(c->>'application_submitted')::boolean then raise exception 'Application not persisted';end if;
 begin perform public.nexora_food_operations_snapshot('rider');raise exception 'Inactive rider gained dispatch access';exception when others then if sqlerrm='Inactive rider gained dispatch access'then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub',(select admin::text from role_fixture),true);
do $$begin
 if public.nexora_food_workspace_context()->>'path'<>'/admin'then raise exception 'Existing admin redirect failed';end if;
 if not exists(select 1 from jsonb_array_elements(public.nexora_food_workspace_requests())r where r->>'id'=(select requester::text from role_fixture))then raise exception 'Admin request missing';end if;
 perform public.nexora_food_approve_workspace((select requester from role_fixture),'Verified test admin request');
 perform public.nexora_food_approve_workspace((select rider from role_fixture),'Verified test rider request');
end$$;
select set_config('request.jwt.claim.sub',(select rider::text from role_fixture),true);
do $$declare c jsonb;begin c:=public.nexora_food_workspace_context();if not(c->>'ready')::boolean or c->>'path'<>'/rider'then raise exception 'Approved rider login failed';end if;end$$;
select set_config('request.jwt.claim.sub',(select requester::text from role_fixture),true);
do $$declare c jsonb;begin c:=public.nexora_food_workspace_context();if not(c->>'ready')::boolean or c->>'path'<>'/admin'then raise exception 'Approved admin login failed';end if;end$$;
select set_config('request.jwt.claim.sub',(select customer::text from role_fixture),true);
do $$begin
 if public.nexora_food_workspace_context()->>'path'<>'/'then raise exception 'Customer login failed';end if;
 begin perform public.nexora_food_workspace_context('super_admin');raise exception 'Invalid role allowed';exception when others then if sqlerrm='Invalid role allowed'then raise;end if;end;
end$$;
reset role;
update public.nexora_food_profiles set is_blocked=true where id=(select customer from role_fixture);
set local role authenticated;
do $$begin begin perform public.nexora_food_workspace_context();raise exception 'Blocked account allowed';exception when others then if sqlerrm='Blocked account allowed'then raise;end if;end;end$$;
rollback;
