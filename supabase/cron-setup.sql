-- Food-only scheduler, already deployed by the location-validation migration.
select cron.schedule('nexora-food-expire-orders','* * * * *','select public.nexora_food_expire_orders();');
