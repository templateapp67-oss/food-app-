-- Food-only scheduler, already deployed by the location-validation migration.
select cron.schedule('nexora-food-expire-orders','* * * * *','select public.nexora_food_expire_orders();');

-- New migration installs this guarded job. Do not paste credentials into SQL.
-- Requires owner-enabled pg_net and Food-only Vault entries:
-- nexora_food_project_url; nexora_food_service_role.
-- Absent configuration leaves the durable work pending.
select cron.schedule('nexora-food-dispatch-cleanup','* * * * *','select nexora_food_private.schedule_workers();');
