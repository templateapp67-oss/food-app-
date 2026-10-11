# Build_Brief — Scope, Environment, Limits, Gap Analysis

## 1. Scope (v1)
Customer Android app, Restaurant console (web), Admin dashboard (web), Supabase backend with Edge Functions, FCM push, online payment + COD, loyalty ("Rewards"), reviews, favorites, coupons.

**Out of scope for v1 (documented, not forgotten):** native rider app, live GPS tracking, multi-city expansion tooling, scheduled orders, group orders, wallet/stored value, in-app chat with rider, grocery/quick-commerce, subscriptions.

## 2. Supported environment (verify first!)
- Target is a **native Android (Kotlin/Compose)** project. Google AI Studio may only support web (React) projects. **Step 0 of the audit must confirm the real project type.**
  - If native Android is not supported: build the web portal + Supabase backend inside the workspace, and develop the Android app in Android Studio using these same docs (recommended), clearly marking the Android part as external. Never present a web app as the Android app.
- Needs: JDK 17+, Android Studio (current stable), Node LTS, Supabase CLI, Docker (local Supabase), Firebase project, payment gateway test account, SMS provider account.

## 3. Required deliverables
Android source, web portal source, `supabase/migrations`, RLS policies + tests, seed data, Edge Functions + deploy guide, `.env.example` files, README, test report, FCM guide, payment guide, Play Store release guide, status matrix (Implemented & tested / Implemented awaiting config / Partial / Not implemented).

## 4. Current status
Unknown until the initial audit. Do not assume anything exists. Record the audit result in `08_TRACKER.md`.

## 5. GAP ANALYSIS (what the original two prompts did not cover)

| ID | Gap | Severity | Resolution / where fixed |
|---|---|---|---|
| G-01 | Second prompt says "17 files" but lists 18; numbering skips `01_`. | Low | Treated as 18 files, no 01 (00_MASTER §2). |
| G-02 | Phase sequences differ (7 phases vs 10 phases). | Med | Unified 0–10 in `09_Phases.md`. |
| G-03 | No authority/precedence rule between docs. | High | 00_MASTER §3. |
| G-04 | Delivery partner (rider) role missing, yet statuses include Out for Delivery/Delivered. | High | D-004 default: admin/restaurant-assigned riders via minimal rider web view; tables `delivery_partners`, `delivery_assignments` in 05_SCHEMA. |
| G-05 | Restaurant console form factor undefined (Android? web?). | High | D-005: web portal route `/restaurant` in same React app. |
| G-06 | Phone OTP needs an SMS provider; India needs TRAI DLT registration of sender + templates. | High | D-006 PENDING; blocker listed in 04_TECHSPEC. Dev uses Supabase test OTP numbers only. |
| G-07 | Payment gateway not chosen; webhook handling, refunds, RBI/PCI scope unspecified. | High | D-007 default Razorpay (confirm). Flow in 02_Architecture + 06_RULES. |
| G-08 | Maps/geocoding/serviceability provider and method not chosen. | High | D-008: PostGIS polygons/radius for zones; Google Places/Geocoding optional. |
| G-09 | Search implementation unspecified. | Med | Postgres `pg_trgm` + full-text; RPC `search_catalog`. |
| G-10 | Order status model mixes fulfillment with refund states. | High | 06_RULES: separate `order_status`, `payment_status`, `refund_status`; "Refund Pending/Refunded" are derived display states. |
| G-11 | No auto-timeouts (restaurant doesn't accept; payment never completes). | High | 06_RULES §Timeouts + `pg_cron` jobs. |
| G-12 | No money precision/rounding policy. | High | Integer paise; rounding in 06_RULES §Pricing. |
| G-13 | Tax/GST, FSSAI, invoice requirements absent. | High | Tax config in `app_settings`; invoice fields in schema; **needs CA confirmation** (D-009 PENDING). |
| G-14 | Roles undefined (only "owner"/"admin"). | High | `user_roles` + `restaurant_members.role`; roles: customer, restaurant_owner, restaurant_staff, rider, support, admin, super_admin. |
| G-15 | Fraud/abuse controls: OTP pumping, COD abuse, coupon abuse, fake reviews. | High | 06_RULES §Abuse; rate limits; COD cap & blocklist. |
| G-16 | Account deletion: Play Store needs in-app AND web-accessible deletion path + Data Safety form. | High | 06_RULES §Deletion, 11_SCREENS S-054. |
| G-17 | Privacy law (India DPDP Act 2023), consent, retention, grievance officer. | High | Content.md legal placeholders; D-010 PENDING lawyer review. |
| G-18 | Restaurant payouts / settlement / commission accounting missing. | Med | `restaurant_settlements` table; v1 = report + manual payout (D-011). |
| G-19 | Environments, CI/CD, backups, monitoring unspecified. | Med | 04_TECHSPEC §Environments; Engineering-Practices §CI. |
| G-20 | Crash reporting, analytics, remote config, forced-update. | Med | Firebase Crashlytics + Analytics (consent-gated), min-version check in `app_settings`. |
| G-21 | Realtime authorization & fallback specifics. | Med | 02_Architecture §Realtime; polling fallback every 15 s. |
| G-22 | Image licensing + resizing pipeline unspecified. | Med | Visual.md §Imagery; Storage + Coil; transforms optional (plan-dependent). |
| G-23 | Accessibility bug: white text on `#FF7138` is ~2.7:1 (fails WCAG AA 4.5:1). | Med | Visual.md: use dark text `#101114` on accent buttons (~6.9:1). |
| G-24 | Light theme palette not defined. | Low | Visual.md light tokens. |
| G-25 | Localization (English + Hindi) not specified. | Med | Compose string resources; Content.md has EN, HI optional keys. |
| G-26 | Notification channels, Android 13+ permission timing. | Low | 04_TECHSPEC §FCM; Content.md. |
| G-27 | Idempotency storage design and webhook replay protection. | High | `idempotency_keys`, `webhook_events` tables. |
| G-28 | Support tooling (tickets) lifecycle undefined. | Low | `support_tickets` states in 06_RULES. |
| G-29 | Test data separation, pgTAP for RLS, concurrency test method. | Med | Engineering-Practices §Testing. |
| G-30 | Delivery fee model (distance/slab/free-above) undefined. | Med | 06_RULES §Delivery fee: slab by distance, configurable. |
| G-31 | Tips and packaging charges unmentioned. | Low | Optional `tip_paise`, `packaging_paise` in orders. |
| G-32 | Restaurant new-order alerting (sound/vibration, persistent) undefined. | Med | Portal uses Realtime + audible alert + FCM web push optional. |
| G-33 | AI Studio generates a whole app from any design/app hint; nothing stops it from ignoring the docs. | High | Documentation Gate (00_MASTER §4b), docs/ai-studio/*, tools/gate_check.py + CI (D-023). Prompt rules are not a hard lock; external check is. |

## 6. Critical limitations to state honestly in every report
Payments, SMS, FCM, maps, and tax compliance cannot be marked complete without live external configuration and verification.
