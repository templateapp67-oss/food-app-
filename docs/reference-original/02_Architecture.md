# 02_Architecture

## 1. Repository layout (monorepo, Git-ready)
```
/android            Kotlin app (Compose, MVVM)
/web                React+TS: /admin and /restaurant and /rider routes
/supabase
  /migrations       timestamped SQL (never edit applied ones)
  /functions        Edge Functions (Deno/TS)
  /tests            pgTAP RLS + SQL tests
  seed.sql          demo seed (flagged is_demo=true)
/docs               these 18 files
/.github/workflows  CI
```

## 2. System view
Clients (Android, Web) → Supabase (Auth, PostgREST, Realtime, Storage) and Edge Functions → external: Payment gateway, FCM, SMS provider, Maps (optional).
- Reads: clients query Postgres through RLS-protected views/tables/RPC.
- Writes that move money/state: **only** via Edge Functions or SECURITY DEFINER RPCs that re-validate everything.
- Service-role key exists only in Edge Function secrets.

## 3. Android layers (MVVM + repository)
`ui/` (Compose screens, ViewModels, UiState sealed classes) → `domain/` (use cases, models) → `data/` (repositories, supabase-kt datasources, Room cache, DataStore) → `core/` (theme, network, di, util).
- One-way data flow: Event → ViewModel → StateFlow<UiState> → Compose.
- Collect with `collectAsStateWithLifecycle`.
- Feature packages: `auth, onboarding, home, search, restaurant, item, cart, checkout, orders, tracking, reviews, favorites, rewards, profile, notifications, support`.
- DI: Hilt. Navigation: Navigation Compose with typed routes + deep links `mealora://order/{id}`.

## 4. Web layers
`features/{admin,restaurant,rider}`, shared `components`, `lib/supabase`, TanStack Query, route guards **plus** server enforcement (guards are UX only).

## 5. Edge Functions (trusted server code)
| Function | Responsibility |
|---|---|
| `quote-cart` | Re-price cart: items, variants, add-ons, taxes, fees, coupon, loyalty preview. Returns signed quote id + totals. |
| `place-order` | Idempotent checkout: validate availability, zone, quote; create order+items (snapshots); reserve loyalty; create gateway order for online. |
| `payment-webhook` | Verify gateway signature; dedupe via `webhook_events`; set `payments.status`; move order `pending_payment→placed`. |
| `verify-payment` | Client-triggered server verification fallback (never trusts client status). |
| `order-transition` | Role-checked state machine; writes `order_status_history`; triggers notifications/loyalty. |
| `cancel-order` | Rules-based customer cancellation → refund request. |
| `process-refund` | Calls gateway; updates `refunds` only from confirmed provider response/webhook. |
| `award-loyalty` | Idempotent earn on delivered (also callable by DB trigger via queue). |
| `send-notification` | FCM HTTP v1 using service-account secret; dedupe by (order, event, user). |
| `admin-*` | Privileged admin actions with audit log writes. |
| `delete-account-request` | Creates request; scheduled job executes retention-aware anonymization. |
| `rate-limit-otp` (or provider/Supabase limits) | Abuse control. |

## 5b. Scheduled jobs (pg_cron / scheduled functions)
- Expire `pending_payment` orders after 15 min.
- Auto-reject unaccepted `placed` orders after configurable N min → refund.
- Expire loyalty points past expiry (writes `expire` ledger rows).
- Retry failed notifications; purge stale device tokens.

## 6. Order creation flow (online payment)
1. App → `quote-cart` (server totals). 2. App → `place-order` with `Idempotency-Key`. 3. Server creates order `pending_payment` + gateway order. 4. Android SDK pays. 5. Gateway webhook → `payment-webhook` verifies signature → `paid`, order `placed`, notifies restaurant. 6. App shows confirmation only after backend state is `placed` (poll `verify-payment` if webhook delayed). COD: order goes straight to `placed`, payment `cod_pending`.

## 7. Realtime
- Customers subscribe to their own `orders` row changes (RLS applies to Realtime via postgres_changes with RLS).
- Restaurants subscribe to orders filtered by their restaurant ids.
- Fallback: poll every 15 s while tracking screen visible; exponential backoff on reconnect.
- Realtime = in-app; FCM = OS-level. Never rely on one for correctness: DB is the source of truth.

## 8. AuthN/AuthZ boundaries
- JWT from Supabase Auth. Role lookup via `user_roles` and `restaurant_members` (not from user-editable metadata).
- Helper SQL functions: `is_admin()`, `is_support()`, `is_restaurant_member(restaurant_id)`.
- Frontend role flags are display only.

## 9. Observability
Structured logs in functions (request id, user id hash, no PII/secrets), Crashlytics (Android), Sentry-equivalent for web optional, DB slow-query review, alerting on webhook failures.

## 10. Environments & config
See `04_TECHSPEC.md`. Config via BuildConfig (public only), `.env` for web public vars, Supabase secrets for server.
