-- Temporary COD-only launch. Removing this named constraint is an explicit future change.
update public.nexora_food_app_settings set value='false'::jsonb,updated_at=now() where key='payments.online_enabled';
update public.nexora_food_app_settings set value='true'::jsonb,updated_at=now() where key='cod.enabled';
alter table public.nexora_food_app_settings add constraint nexora_food_cod_only_payment_setting check (key<>'payments.online_enabled' or value='false'::jsonb);
