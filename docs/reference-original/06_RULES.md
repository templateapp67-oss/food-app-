# 06_RULES — Business Rules (server-authoritative)

## 1. Order state machine
`order_status`: pending_payment, placed, confirmed, preparing, ready_for_pickup, out_for_delivery, delivered, rejected, cancelled.
Refund info lives in `payments.status` / `refunds`; UI shows "Refund Pending/Refunded" as a derived badge.

| From | To | Allowed actor | Condition |
|---|---|---|---|
| (new) | pending_payment | system (`place-order`) | online payment |
| (new) | placed | system | COD |
| pending_payment | placed | system (verified webhook) | signature verified |
| pending_payment | cancelled | system/customer | timeout 15 min or user abort |
| placed | confirmed | restaurant | within accept window |
| placed | rejected | restaurant / system(timeout) | reason required; triggers refund if paid |
| placed/confirmed | cancelled | customer | before `preparing` (D-013); triggers refund |
| confirmed | preparing | restaurant | |
| preparing | ready_for_pickup | restaurant | |
| ready_for_pickup | out_for_delivery | rider/restaurant/admin | rider assigned |
| out_for_delivery | delivered | rider/admin | COD → `cod_collected` |
| preparing/ready/out | cancelled | admin/support only | reason + audit |
Any other transition is rejected and logged. Every transition writes `order_status_history` and is idempotent (same target state twice = no-op).

## 2. Pricing (all integer paise; server computes)
```
items_subtotal = Σ (item_price_at_order + variant + addons) × qty
coupon_discount = capped per coupon rules, ≤ items_subtotal
loyalty_discount = min(points_redeemed × 10 paise, max_pct × items_subtotal)   // 100 points = ₹10 = 1000 paise (config)
discounted_items = items_subtotal − coupon_discount − loyalty_discount
delivery_fee = slab(distance_km) or free above threshold (app_settings)
packaging, platform_fee = config (optional)
tax = Σ per tax_class on discounted_items (+ tax on fees as configured)  // rates PENDING CA (D-009)
total = discounted_items + delivery_fee + packaging + platform_fee + tax + tip
```
Rounding: compute per line in paise, round half-up once per tax line; never round intermediate subtotals. Loyalty config key: `loyalty.redeem_paise_per_100_points = 1000` (so 1 point = 10 paise).
Order stores all components + snapshots. Past orders never recalculated.

## 3. Cart rules
- One restaurant per cart; adding from another restaurant → confirm dialog to replace.
- Quantity 1..max_qty_per_item (config, default 20); no negatives.
- Required add-on groups satisfied; min/max select enforced; unavailable item/variant/addon blocks checkout.
- Min order, restaurant open (hours + not temporarily closed), address serviceable.
- Any mismatch between client totals and server quote → server wins, client shows "prices updated".

## 4. Coupons
Validated only on server. Checks: active, date window, min order, per-user and global limits, restaurant scope, first-order-only. **Stacking:** one coupon per order (`stackable=false`); coupon + loyalty redemption allowed; combined discount cannot exceed items_subtotal. Redemption row created in same transaction as order; released if order is cancelled before use per policy (config).

## 5. Payments
- COD: allowed if `cod.enabled`, total ≤ `cod.max_paise`, user not COD-blocked. Rider records collection.
- Online: `paid` only from verified gateway signature/webhook. Duplicate webhooks ignored via `webhook_events`.
- Amount mismatch between gateway and order → flag, do not mark paid, alert admin.
- Failed/abandoned payment keeps order `pending_payment` until timeout → cancelled.

## 6. Cancellation & refunds
| Situation | Refund |
|---|---|
| Customer cancels before `preparing` (paid) | full to original method |
| Restaurant rejects / timeout | full |
| Cancelled after preparing by admin (restaurant fault) | full; else per admin decision |
| Partial item issue (support) | partial, reason + audit |
Refund = `requested → processing → succeeded/failed`; UI says "completed" only on `succeeded`. Loyalty: redeemed points restored on full cancel; earned points reversed on refund per §7.

## 7. Loyalty
- Earn: on `delivered`, `floor(eligible_paise / earn_per_paise)`; default 1 pt per ₹100 (10000 paise). Eligible = items_subtotal − coupon − loyalty discounts (excludes fees, taxes, tip).
- Never for rejected/cancelled/refunded orders. Full refund after earn → `reversal` ledger row (floor at 0 balance with negative handling policy: balance may not go below zero; shortfall logged).
- Redeem: min 100 points, max 20% of items_subtotal, in multiples of 100 points, atomic with row lock; points deducted at order creation (`redeem` row), restored if order cancelled/rejected before delivery.
- Expiry: 365 days from earn (FIFO consumption). Tiers from `loyalty_tiers` by lifetime points (defaults Bronze 0 / Silver 500 / Gold 1500 — configurable, benefits only if configured).
- All earn rows idempotent by unique index.

## 8. Reviews
Only the order's customer, order `delivered`, within review window (default 14 days). One restaurant review per order; one item review per order_item. Edit within 24 h; no user delete (admin hide). Rating 1–5. Aggregates by trigger. Reports → moderation queue with audit trail. Rate limit submissions.

## 9. Timeouts (pg_cron, config)
pending_payment 15 min; restaurant accept window 5 min (default) → auto-reject + refund; stuck `out_for_delivery` > 3 h → admin alert.

## 10. Delivery fee
Slabs by straight-line km from restaurant (config), free above threshold, restaurant override allowed. Out of zone → not orderable.

## 11. Abuse & security
OTP: resend cooldown 30 s, max 5/hour/phone & per-IP/device limits (provider + function); lockout on repeated wrong codes. Checkout: rate limit per user. COD: cap + block after repeated refusals. Review/coupon abuse monitored. Account blocked → cannot place orders. Admin actions require reason + audit row.

## 12. Account deletion & retention
In-app request + web URL. Process: verify, cancel open orders, anonymize profile/addresses/tokens, **retain order & payment records required by tax/legal (retention period per CA/lawyer, D-009/D-010)**, confirm to user. Marketing consent revoked.

## 13. Support tickets
`open → pending → resolved → closed`; user can reopen within 7 days; refunds above threshold need admin.

## 14. Restaurant permissions
Owner/staff can: edit hours, temp-close, menu/items/availability, accept/reject within accept window, status updates up to ready_for_pickup. Cannot: change commission/status, see payment details, see other restaurants, see customer phone beyond what delivery needs (masked where possible).
