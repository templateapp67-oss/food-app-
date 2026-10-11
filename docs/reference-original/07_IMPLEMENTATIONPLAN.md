# 07_IMPLEMENTATIONPLAN — Ordered Task Plan

Task IDs `P{phase}-{nn}`. Each task lists Output → Verify. Do not start a phase until the previous exit criteria in `09_Phases.md` are met.

## Phase 0 — Audit (read-only)
P0-01 Confirm project type/toolchain (native Android supported? web only?) → report.
P0-02 Read docs in order; build requirements matrix; list CONFLICT/MISSING.
P0-03 Inspect code, Supabase config, migrations, functions, tests, build status.
P0-04 Produce audit report + first phase recommendation. **No code changes.**

## Phase 1 — Foundation
P1-01 Monorepo structure, README skeleton, `.gitignore`, `.env.example` (no secrets).
P1-02 Android project, version catalog, pinned versions → record in 04_TECHSPEC §9.
P1-03 Theme tokens (Visual.md), typography, shapes, dark theme (+light defined).
P1-04 Navigation (5 tabs + graph), deep-link scheme, back-stack preservation.
P1-05 Core components (Design.md §3) with previews.
P1-06 Build variants (debug/staging/release), BuildConfig public config, Hilt, logging.
P1-07 Web app skeleton (routes admin/restaurant/rider, tokens, auth shell).
P1-08 CI pipeline basic. → Verify: app builds, tabs navigate, web builds.

## Phase 2 — Backend & security
P2-01 Supabase local stack; migrations 001–006 (05_SCHEMA).
P2-02 RLS policies + helper functions (migration 007–008) + storage policies.
P2-03 pgTAP tests for RLS (customer, owner, admin, anon).
P2-04 Auth config (test OTP in dev), profile creation trigger.
P2-05 Android auth data layer (supabase-kt), session persistence, typed models/repositories.
P2-06 Seed (demo flagged). → Verify: RLS tests pass; auth works with test numbers.

## Phase 3 — Core customer
P3-01 Splash/onboarding/login/OTP/profile setup (S-001..006).
P3-02 Address management + serviceability RPC (S-011..013).
P3-03 Home (S-010) with real queries + pagination + skeletons.
P3-04 Search RPC + UI + filters/sort (S-020..022).
P3-05 Restaurant detail + menu + collapsible sections (S-030).
P3-06 Item customization sheet + validation (S-031).
P3-07 Favorites (S-080).

## Phase 4 — Cart & checkout
P4-01 Local cart (Room), single-restaurant rule, replace dialog.
P4-02 `quote-cart` function + tests.
P4-03 Coupons validation + list.
P4-04 `place-order` idempotent + `idempotency_keys` + tests.
P4-05 COD flow end-to-end.
P4-06 Online payment: gateway order, Android SDK, `payment-webhook`, `verify-payment`, replay protection (needs D-007 credentials; else BLOCKED).
P4-07 Checkout UI + confirmation.

## Phase 5 — Order lifecycle
P5-01 `order-transition` + state machine tests (all legal/illegal pairs).
P5-02 Tracking UI + Realtime + polling fallback.
P5-03 Orders list/detail/receipt/reorder.
P5-04 Cancellation + refunds (`cancel-order`, `process-refund`) + timeouts (cron).
P5-05 FCM: token registration, `send-notification`, deep links, dedupe (needs Firebase).

## Phase 6 — Reviews & loyalty
P6-01 Review RPCs, eligibility, triggers for aggregates, report flow, UI.
P6-02 Loyalty ledger, `award-loyalty`, redemption RPC with locking, expiry job.
P6-03 Rewards UI + checkout redemption.
P6-04 Concurrency tests (parallel redeem, duplicate award).

## Phase 7 — Restaurant console (web)
P7-01 Auth/role guard + restaurant picker. P7-02 Live orders board + sound alert + accept/reject/status. P7-03 Menu manager + image upload. P7-04 Hours/temp close. P7-05 Reviews + sales summary. P7-06 Ownership tests (cannot touch other restaurants).

## Phase 8 — Admin dashboard
P8-01 Admin auth + `is_admin` enforcement. P8-02 Restaurants + zones + owner assignment. P8-03 Orders + refunds. P8-04 Customers/support tickets. P8-05 Promotions. P8-06 Reviews moderation. P8-07 Loyalty config/ledger/adjust. P8-08 Notifications. P8-09 Settings. P8-10 Audit logs. P8-11 Rider assignment + settlement report + deletion requests.

## Phase 9 — QA & hardening
P9-01 Full test suites per Engineering-Practices §6. P9-02 Security review (secret scan, RLS audit, webhook, rate limits). P9-03 Accessibility + small-screen + font-scale pass. P9-04 Performance pass. P9-05 Fix defects; regression.

## Phase 10 — Release prep
P10-01 App icon, package id, signing (keystore stored securely, Play App Signing). P10-02 Release build, R8, remove demo data/debug. P10-03 Play Data Safety, permissions, privacy URL, account-deletion URL. P10-04 Store listing assets. P10-05 Deployment runbook, backups/restore drill, monitoring. P10-06 Legal sign-off (D-009/D-010). P10-07 Final status matrix (Implemented & tested / awaiting config / partial / not implemented).
