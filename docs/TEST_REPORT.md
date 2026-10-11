# Verification report — 2026-10-11

## Executed
- 27 Web Vitest/jsdom tests: discovery/cards/details/recommendation fallbacks, demo checkout, profile/menu editing, Jaipur restrictions and email-auth success/failure/confirmation behavior with mocked Auth responses.
- Strict TypeScript and Vite production build. The JS bundle remains about 560 kB before gzip; code splitting is a future optimization.
- Five Food migrations executed on the connected Supabase project; all 43 public Food tables have RLS.
- Transactional real-database integration: isolated customer profile/roles; editable metadata cannot escalate; direct role insert denied; non-admin grant denied; outside-Jaipur address denied; owner restaurant/menu/hours; admin approval/zone/rider; server ₹529 quote for two ₹250 items + ₹29 fee; idempotent COD order; customer cannot deliver or review undelivered order; cross-restaurant menu edit denied; unassigned rider cannot read; assigned rider can progress; revoked rider cannot read/deliver; delivery sync, COD collection, verified review/rating, reward accrual and notifications. All fixtures and Auth-trigger side effects rolled back.
- Public HTTP checks: Auth settings, Food configuration RPC and 18 Jaipur locations returned HTTP 200.
- Storage buckets and ownership policy definitions inspected; existing policies are bucket-scoped.
- Five prefixed Food Edge Functions deployed. Payment and push providers have not been invoked with credentials.

## Not executed
Actual browser/visual/device E2E, live signup/password sign-in, reset-email delivery/redirect, actual image-upload round trip, native compilation/UI tests, Razorpay/SMS/FCM provider tests, concurrent load/stress tests. Browser QA was skipped because the required managed control-browser capability is unavailable; no improvised preview/browser was started. No APK exists.

Original standalone pgTAP tests are archived alongside the legacy schema. The current Food integration SQL is under `supabase/tests/shared-food-integration.sql`. CI source has been updated for that contract; no remote CI execution is claimed.

Direct photo selection, metadata preservation, invalid-file rejection and cleanup on denied saves are covered by four new DOM tests. The real-database integration also exercises the photo-only save RPC and denies customer edits. Browser/mobile test definitions and native UI Automator smoke tests are now included; execution is still pending actual browser/emulator access.
