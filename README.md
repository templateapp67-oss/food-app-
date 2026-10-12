# Nexora Food

Public Web customer ordering, Restaurant/Super Admin dashboards and Rider view, connected to the owner's shared Supabase project `zilwgiuiygqqardzutxi`. Food objects are isolated under `nexora_food_*`; existing salon/jobs objects are preserved. Native Android source shares the Food REST/RPC contract.

## Available
- Email/password signup and login; Food account/profile initialization; private avatar uploads and saved Jaipur addresses.
- Jaipur restaurant applications, admin approval, member assignment/revocation, menu and restaurant photos, weekly hours and delivery zones.
- Server-priced COD checkout, quote expiry, idempotency, coupons, order transitions and status notifications.
- Active rider assignment, pickup/delivery/COD confirmation, delivery address and GPS location updates.
- Verified delivered-order customer reviews, rating aggregation, moderation, rewards, support, settings and audit records.
- Food storage buckets and tables with RLS, private privileged implementations and public invoker RPC wrappers. Food-only expiry scheduler runs every minute.
- Food push queue/device registration and verified account-deletion workers are implemented with configuration guards. Online payments remain disabled. See docs/CRITICAL_GAPS.md for provider, Vault/pg_net and legal prerequisites.

## Run Web
```bash
npm ci
npm test
npm run build
```
Public URL/key defaults are in `web/src/backend-config.ts`; environment variables can override them. Privileged keys are never in the client. New visitors use live mode. A clearly labelled device-local demo is available; existing demo users can choose **Switch to live**. Demo orders do not dispatch food.

Routes: `/#/`, `/#/search`, `/#/orders`, `/#/profile`, `/#/restaurant`, `/#/admin`, `/#/rider`. Public draft policies: `/#/terms`, `/#/privacy`, `/#/refund-policy`, `/#/delete-account`.

See [SETUP.md](docs/SETUP.md), [STATUS.md](docs/STATUS.md), [TEST_REPORT.md](docs/TEST_REPORT.md) and [ANDROID.md](docs/ANDROID.md). GitHub Actions compiled the debug APK; download it from the `nexora-food-debug-apk` artifact. Browser CI passed 12 checks on both built and live deployments.

## Database sources
Only Food-prefixed files in `supabase/migrations/` form the current shared-project migration chain. Original standalone migrations and their tests are retained in `supabase/legacy-migrations/`; do not apply them to this shared project. Original Markdown reference documents remain under `docs/reference-original/`. The owner's full authorization supersedes historical PLAN/GO gates.

Browser/mobile/GPS and Android emulator test setup: [DEVICE_TESTING.md](docs/DEVICE_TESTING.md). These suites are prepared for external CI/device access and have not run in the managed workspace.
