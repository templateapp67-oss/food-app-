CREATE OR REPLACE FUNCTION nexora_food_private.nexora_food_transition_order(p_order uuid, p_to text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.nexora_food_orders;admin boolean:=nexora_food_private.nexora_is_admin();owner boolean;customer boolean;rider boolean;allowed boolean:=false;earn integer;begin
 if auth.uid() is null then raise exception 'Sign in required';end if;if exists(select 1 from public.nexora_food_profiles where id=auth.uid()and is_blocked)then raise exception 'Account blocked';end if;select * into o from public.nexora_food_orders where id=p_order for update;if not found then raise exception 'Order not found';end if;
 owner:=nexora_food_private.nexora_member(o.restaurant_id);customer:=o.user_id=auth.uid();rider:=nexora_food_private.active_rider(o.id);if not(admin or owner or customer or rider)then raise exception 'Access denied';end if;
 if o.status::text=p_to then return;end if;
 allowed:=(o.status='placed'and p_to in('confirmed','rejected')and(owner or admin)and now()<o.created_at+interval '5 minutes')or(o.status='confirmed'and p_to='preparing'and(owner or admin))or(o.status='preparing'and p_to='ready_for_pickup'and(owner or admin))or(o.status='ready_for_pickup'and p_to='out_for_delivery'and(owner or admin or rider)and exists(select 1 from public.nexora_food_delivery_assignments where order_id=o.id))or(o.status='out_for_delivery'and p_to='delivered'and(admin or rider))or(o.status in('pending_payment','placed','confirmed')and p_to='cancelled'and(customer or admin))or(o.status in('preparing','ready_for_pickup','out_for_delivery')and p_to='cancelled'and admin);
 if not allowed then raise exception 'This order status change is not allowed';end if;
 if rider and not(admin or owner)and p_to in('out_for_delivery','delivered')and not exists(select 1 from public.nexora_food_delivery_assignments where order_id=o.id and dispatch_state=case when p_to='out_for_delivery'then 'picked_up'else 'out_for_delivery'end)then raise exception 'Complete the rider pickup stages first';end if;
 
 if p_to in('cancelled','rejected')and length(trim(coalesce(p_reason,'')))<3 then raise exception 'Reason is required';end if;
 update public.nexora_food_orders set status=p_to::public.nexora_food_order_status,accepted_at=case when p_to='confirmed'then now()else accepted_at end,delivered_at=case when p_to='delivered'then now()else delivered_at end,cancelled_at=case when p_to in('cancelled','rejected')then now()else cancelled_at end,cancel_reason=case when p_to in('cancelled','rejected')then p_reason else cancel_reason end,cancelled_by=case when p_to in('cancelled','rejected')then auth.uid()else cancelled_by end,payment_status=case when p_to='delivered'and payment_method='cod'then 'cod_collected'::public.nexora_food_payment_status when p_to in('cancelled','rejected')and payment_status='paid'then 'refund_pending'::public.nexora_food_payment_status else payment_status end,updated_at=now()where id=o.id;
 insert into public.nexora_food_order_status_history(order_id,from_status,to_status,actor_id,actor_role,note)values(o.id,o.status,p_to::public.nexora_food_order_status,auth.uid(),case when admin then 'admin' when owner then 'restaurant' when rider then 'rider' else 'customer' end,p_reason);
 if p_to in('cancelled','rejected')then
 if o.points_redeemed>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,reason)values(o.user_id,'adjustment',o.points_redeemed,o.id,'restore:'||o.id,'Order cancelled')on conflict(ref)do nothing;end if;
 update public.nexora_food_coupon_redemptions set released_at=now()where order_id=o.id;
 if o.payment_status='paid'then insert into public.nexora_food_refunds(order_id,payment_id,amount_paise,reason,requested_by)select o.id,id,o.total_paise,p_reason,auth.uid()from public.nexora_food_payments where order_id=o.id and status='paid';end if;
 end if;
 if p_to='delivered'then earn:=floor((o.items_subtotal_paise-o.discount_coupon_paise-o.discount_loyalty_paise)::numeric/coalesce((nexora_food_private.nexora_setting('loyalty.earn_per_paise')#>>'{}')::bigint,10000));if earn>0 then insert into public.nexora_food_loyalty_ledger(user_id,type,points,order_id,ref,expires_at)values(o.user_id,'earn',earn,o.id,'earn:'||o.id,now()+interval '365 days')on conflict do nothing;update public.nexora_food_orders set points_earned=earn where id=o.id;end if;end if;
 insert into public.nexora_food_user_notifications(user_id,type,title,body,order_id,dedupe_key)values(o.user_id,'order','Order update','Your order status changed. Open Nexora Food for details.',o.id,o.id||':'||p_to)on conflict do nothing;
 if admin then insert into public.nexora_food_admin_audit_logs(actor_id,action,entity,entity_id,before,after,reason)values(auth.uid(),'order-transition','orders',o.id::text,jsonb_build_object('status',o.status),jsonb_build_object('status',p_to),coalesce(p_reason,'Order progression'));end if;
end$function$;

create or replace function nexora_food_private.nexora_food_rider_location(p_order uuid,p_lat numeric,p_lng numeric)returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid()is null or not nexora_food_private.active_rider(p_order)or not exists(select 1 from public.nexora_food_orders where id=p_order and status in('confirmed','preparing','ready_for_pickup','out_for_delivery'))then raise exception 'Assigned active rider required';end if;
 if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'Invalid coordinates';end if;
 update public.nexora_food_delivery_assignments set last_latitude=p_lat,last_longitude=p_lng,location_updated_at=now()where order_id=p_order;
end$$;
notify pgrst,'reload schema';
