# Connected Food backend

## Current project
`https://zilwgiuiygqqardzutxi.supabase.co` is connected at the owner's request. The Food database has been deployed separately from salon/jobs tables: `public.nexora_food_*`, `nexora_food_private`, Food-only functions, buckets and scheduled job. Global Auth configuration was not changed.

Current Auth settings were checked: email signup/password enabled, auto-confirm enabled, phone auth disabled. Existing platform accounts can sign in. A user's editable metadata never grants Food privileges. `templateapp67@gmail.com` is the existing verified owner account with Food Super Admin access; use its existing password. No password was created or exposed.

## Web and Android public configuration
Web defaults live in `web/src/backend-config.ts`. Optional overrides:
```
VITE_SUPABASE_URL=https://zilwgiuiygqqardzutxi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<public publishable key>
VITE_DEMO_ENABLED=true
```
Android defaults point to the same project and public key. Gradle properties can override them. Never place service-role, payment, Firebase or signing secrets in these builds.

Email reset/confirmation redirect origins need an Auth allowlist check before enabling these email-dependent flows for production. The shared Auth allowlist was not changed. Phone OTP needs a provider before it can be exposed.

## Restaurant onboarding
1. Sign in; select Restaurant dashboard; submit a Jaipur restaurant application.
2. Add dishes/photos/profile and set weekly hours. The application starts pending.
3. Super Admin approves the restaurant and adds a delivery zone. Restaurant membership determines access; granting a global restaurant role alone does not grant membership.
4. Customers can order only when the restaurant is active, open, has eligible items and covers the address. Prices and serviceability are recalculated on the server.

Admin can assign/remove members, grant/revoke roles, block/unblock Food accounts and approve riders. Removing/blocking the final active Super Admin is rejected. Rider access is restricted to assigned orders and is withdrawn on deactivation.

## Images and location
Buckets: `nexora-food-restaurants` and `nexora-food-menu` are public; `nexora-food-avatars` is private and uses owner-only signed URLs. JPEG/PNG/WebP, maximum 5 MB. Upload folders identify the restaurant or avatar owner. Jaipur has 18 supported localities; saved coordinates are checked against the launch bounds, postal codes and server delivery zones. Display distance is a straight-line estimate, not road distance. GPS uses the browser's normal permission request; manual coordinates remain available.

## Payments and push
Five deployed Edge Functions:
- `nexora-food-place-order`
- `nexora-food-verify-payment`
- `nexora-food-payment-webhook` (raw-body HMAC verification; external webhook has no JWT)
- `nexora-food-process-refund`
- `nexora-food-send-notification` (service-only)

Configure server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, and `FIREBASE_SERVICE_ACCOUNT` through Supabase secrets management. Provider secrets were not supplied. `payments.online_enabled=false`; COD is enabled with a ₹10,000 cap, ₹29 flat delivery and zero configured tax. Review these business settings before use. Register the prefixed webhook endpoint and verify capture, mismatch, replay, late payment and refund behavior before enabling online payments. FCM client registration and automated dispatch/retry are still pending. In-app order notifications work independently of FCM.

## Migration and tests
Five shared-project Food migrations were applied through the Supabase migration API. Original standalone SQL is archived under `supabase/legacy-migrations` and is not in the active chain. Do not reapply initial migration to the current project. Remote history names/timestamps are maintained by Supabase; do not run an unsynchronized CLI `db push` against this shared project.

`supabase/tests/shared-food-integration.sql` uses temporary fixtures and rolls back every change. It has been executed against the connected project. It covers role isolation, denied escalation/direct writes, Jaipur validation, owner menu writes, server quote/COD/idempotency, rider assignment/revocation, delivery, reviews, rewards and notifications. The CI source also runs it against a clean local Supabase instance; CI itself has not been run here.

`nexora-food-expire-orders` runs every minute through pg_cron and only handles Food orders/quotes.

Direct image upload is available under Restaurant dashboard → Photos / Hours & profile and Super Admin → Restaurants → Upload photos. Cover, gallery and menu pages can be selected from device storage, previewed, removed and saved. Demo stores small image previews locally; live uses protected Supabase upload folders.

## Critical push/deletion setup — 2026-10-12
See [CRITICAL_GAPS.md](CRITICAL_GAPS.md) for files, manual checks, limits and owner prerequisites. The seven `20261012090000`–`20261012090600` Food migrations are applied to the shared project; do not replay them. Food push/deletion workers and the public verified-email endpoint are deployed. Firebase, Resend, Turnstile, Food-only Vault credentials, pg_net and reviewed legal/retention configuration must be provided before provider-backed operations can run. Do not change shared Auth settings. The four public policies are drafts, not approved legal terms.
