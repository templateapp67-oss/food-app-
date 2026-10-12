# Verification report — 2026-10-11

## Executed
- 27 Web Vitest/jsdom tests: discovery/cards/details/recommendation fallbacks, demo checkout, profile/menu editing, Jaipur restrictions and email-auth success/failure/confirmation behavior with mocked Auth responses.
- Strict TypeScript and Vite production build. The JS bundle remains about 560 kB before gzip; code splitting is a future optimization.
- Five Food migrations executed on the connected Supabase project; all 43 public Food tables have RLS.
- Transactional real-database integration: isolated customer profile/roles; editable metadata cannot escalate; direct role insert denied; non-admin grant denied; outside-Jaipur address denied; owner restaurant/menu/hours; admin approval/zone/rider; server ₹529 quote for two ₹250 items + ₹29 fee; idempotent COD order; customer cannot deliver or review undelivered order; cross-restaurant menu edit denied; unassigned rider cannot read; assigned rider can progress; revoked rider cannot read/deliver; delivery sync, COD collection, verified review/rating, reward accrual and notifications. All fixtures and Auth-trigger side effects rolled back.
- Public HTTP checks: Auth settings, Food configuration RPC and 18 Jaipur locations returned HTTP 200.
- Storage buckets and ownership policy definitions inspected; existing policies are bucket-scoped.
- Five prefixed Food Edge Functions deployed. Payment and push providers have not been invoked with credentials.

- GitHub Actions run [38129495300](https://github.com/templateapp67-oss/food-app-/actions/runs/38129495300): all 27 Web tests and production build passed; a fresh isolated Supabase migration reset plus transactional Food integration SQL passed.
- Browser CI: 12/12 checks on the built app and 12/12 on the live Sites URL. Projects: Desktop Chrome, Pixel 7 mobile Chromium and iPhone 13 mobile WebKit. Tested viewport fit, touch/mouse restaurant discovery, labelled local demo COD checkout, granted Jaipur geolocation, and direct cover/gallery/menu-page file selection, preview and local save. A discovered iPhone overflow and overlapping header search row were corrected and verified.
- Android SDK 36 debug compilation, JVM unit tests and assembleDebug passed. Fixed obsolete SDK setup package and Compose syntax errors. Debug APK SHA-256: `a6286d37eb40496c150be094e61391921a14caaace4bc6e1d5fe824cc4caa9f3`.

## Not executed
Live signup/password sign-in, reset-email delivery/redirect, real authorized image-upload/storage round trip, full native COD checkout, denied GPS permission, native GPS UI, Razorpay/SMS/FCM provider tests, concurrent load/stress tests and physical-device tests. Browser demo file saves and demo orders must not be described as live fulfillment or backend upload E2E.

Original standalone pgTAP tests are archived alongside the legacy schema. The current Food integration SQL is under `supabase/tests/shared-food-integration.sql`. The database CI job executed that contract successfully against a clean Supabase stack.

Direct photo selection, metadata preservation, invalid-file rejection and cleanup on denied saves are covered by four new DOM tests. The real-database integration also exercises the photo-only save RPC and denies customer edits. Browser/mobile definitions executed on GitHub-hosted browsers. Native instrumentation execution is reported separately below.

## Final CI result
All five jobs passed in [run 38129902657](https://github.com/templateapp67-oss/food-app-/actions/runs/38129902657): Web, database, browser, Android debug build and Android device. Native UI Automator: 2/2 smoke tests passed on an API 35 Android emulator (email sign-in/signup fields and Orders/Rewards navigation after rotation). The rotation test now waits for recreated UI elements before tapping. This checks screen reachability, not actual account sign-in or complete native fulfillment.

The downloadable APK is the app-debug.apk from the successful emulator job, so it is the exact binary installed for the native smoke tests.

## Critical-gap verification — 2026-10-12
`npm ci --offline`, 124 Vitest tests and TypeScript/Vite build passed. The first rolled-back critical-gap SQL suite passed on the connected project (queue/token RLS/idempotency/invalidation/no-token, deletion blockers/cancel/shared-account protection). Extended receipt/email assertions and isolated anonymization/completion are defined for CI; MCP reruns returned invalid/expired requestState, so their live execution is unconfirmed. No actual provider push, verification email, production avatar removal or Auth deletion was performed. GitHub run 38237476391 passed all five jobs: 124 Vitest tests, Deno/production build, seven isolated SQL suites including anonymization/completion, Android JVM/debug build and API 35 emulator smoke checks, 96 built browser tests (3 published-only cases skipped), and 99 published browser tests. Signed-in browser flows use controlled network mocks. The served APK remains the earlier test binary; the newly built APK is in GitHub CI artifacts. See [CRITICAL_GAPS.md](CRITICAL_GAPS.md) for prerequisites and safe manual validation.
