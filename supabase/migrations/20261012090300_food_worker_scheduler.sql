create function nexora_food_private.schedule_workers() returns void language plpgsql security definer set search_path='' as $$
declare url text;secret text;r record;begin
 if to_regclass('vault.decrypted_secrets') is null then return;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1'into url using 'nexora_food_project_url';
 execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1'into secret using 'nexora_food_service_role';
 if url is null or secret is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return;end if;
 for r in select notification_id from public.nexora_food_notification_deliveries where status='pending' and next_attempt_at<=now() order by next_attempt_at limit 20 loop
 perform net.http_post(url:=url||'/functions/v1/nexora-food-send-notification',headers:=jsonb_build_object('Authorization','Bearer '||secret,'Content-Type','application/json'),body:=jsonb_build_object('notification_id',r.notification_id),timeout_milliseconds:=30000);end loop;
 for r in select d.id from public.nexora_food_deletion_requests d left join nexora_food_private.deletion_work w on w.request_id=d.id where d.status in('requested','processing','blocked_active_orders') and coalesce(w.next_attempt_at,now())<=now() and coalesce(w.lease_until,now())<=now() order by d.requested_at limit 10 loop
 perform net.http_post(url:=url||'/functions/v1/nexora-food-process-deletion',headers:=jsonb_build_object('Authorization','Bearer '||secret,'Content-Type','application/json'),body:=jsonb_build_object('request_id',r.id),timeout_milliseconds:=30000);end loop;
end$$;
revoke all on function nexora_food_private.schedule_workers()from public,anon,authenticated;
grant execute on function nexora_food_private.schedule_workers()to service_role;
select cron.schedule('nexora-food-dispatch-cleanup','* * * * *','select nexora_food_private.schedule_workers();');
