# 04_TECHSPEC

> **Version rule:** do not guess versions. At Phase 1, pin exact current-stable versions from official release notes in `gradle/libs.versions.toml` and `package.json`/lockfile, record them in this file under "Pinned versions", and verify the build.

## 1. Android
- Kotlin, Jetpack Compose BOM, Material 3, Navigation Compose, Hilt, Coroutines/Flow, Coil (images), Room (cart + cached lists), DataStore (prefs, onboarding flag), WorkManager (token sync, retry), Firebase BoM (Messaging, Crashlytics, Analytics), `supabase-kt` via its BOM (`io.github.jan-tennert.supabase:bom`) with modules `auth-kt` (renamed from gotrue-kt in 3.x), `postgrest-kt`, `realtime-kt`, `storage-kt`, `functions-kt`; use the same Ktor version supabase-kt recommends, Ktor Android engine, kotlinx.serialization, Razorpay Android SDK (if D-007 stands), JUnit, MockK, Turbine, Compose UI test, Espresso/Maestro for flows.
- `minSdk`: 26 (default, revisit with business data). `targetSdk` = **36** (Google Play requires new apps/updates to target Android 16 / API 36 since 2026-08-31 — verified, see §9). `compileSdk` ≥ 36.
- R8/ProGuard on release; Gradle version catalog; build variants `debug`, `staging`, `release`.
- BuildConfig public fields: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RAZORPAY_KEY_ID` (public key id only), `ENV`. The anon key is public by design; safety comes from RLS.
- Permissions: `INTERNET`, `POST_NOTIFICATIONS` (Android 13+, ask in context after first order, not at launch), `ACCESS_COARSE/FINE_LOCATION` only when user taps "use current location".
- Notification channels: `orders` (high), `offers` (default, user-optional), `account` (low).

## 2. Web (admin + restaurant + rider routes)
React, TypeScript, Vite, React Router, TanStack Query, supabase-js, Zod (validation), a table/chart library (pick one, record), Tailwind or CSS modules (pick one, record). Vitest + Testing Library + Playwright.
Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only.

## 3. Supabase
- Postgres extensions: `pgcrypto`, `pg_trgm`, `postgis`, `pg_cron` (confirm availability on plan), `citext`.
- Auth: phone OTP via an SMS provider (D-006). Dev: Supabase test phone numbers/OTPs. Email optional/secondary.
- Storage buckets: `restaurant-media` (public read, owner/admin write), `menu-media` (same), `avatars` (owner read/write), policies in 05_SCHEMA.
- Edge Functions: Deno + TypeScript. Secrets via `supabase secrets set`.
- Local dev: Supabase CLI + Docker.

## 4. Payments (D-007)
Server creates gateway order; client opens SDK; server verifies signature/webhook; refunds via API. No card data touches our systems. Webhook endpoint: Edge Function with signature verification and replay protection. Test mode in staging.

## 5. Push (FCM)
HTTP v1 API from Edge Function using service-account JSON stored as secret. Android: token registration on login, refresh on `onNewToken`, delete on logout. Data-message payload contains only `order_id`, `event`; app fetches details after auth (no private details on lock screen).

## 6. Maps/location
Serviceability = server-side (PostGIS). Address entry manual + optional current location via fused location. Optional Places autocomplete if key provided (restrict key by package + SHA-1).

## 7. CI/CD (GitHub Actions)
Jobs: android lint+unit+assemble, web typecheck+lint+test+build, supabase `db lint` + pgTAP on local stack, secret scan (gitleaks), dependency audit. Releases: signed AAB built from protected branch with secrets in CI.

## 8. Environments
| Env | Supabase | Payments | Data |
|---|---|---|---|
| local | CLI | mock/test | seed demo |
| staging | project A | test keys | synthetic |
| prod | project B | live keys | real |
Backups: enable PITR/daily backups on prod (plan-dependent; verify). Restore drill before launch.

## 9. Pinned versions

**Method:** npm versions read from the npm registry on 2026-10-11; rule = newest *stable* release **at least 14 days old** (avoids just-published releases). Android items come from official pages where reachable. Anything not confirmed is marked `TO RESOLVE` — do **not** guess; resolve in Phase 1 task P1-02 and replace the cell with the real value + date.
Status: `VERIFIED` (source + date) · `TO RESOLVE`.

### Web / tooling (npm registry, 2026-10-11)
| Package | Pin | Published | Status | Note |
|---|---|---|---|---|
| react / react-dom | 19.3.0 | 2026-09-09 | VERIFIED | |
| typescript | 7.0.2 | 2026-07-08 | VERIFIED (exists) | Major 7: confirm ESLint/typescript-eslint/Vite plugins support it in P1-07; if not, pin previous major and log in 10_memory |
| vite | 8.3.1 | 2026-09-24 | VERIFIED | newer 8.3.4 was <14 days old |
| @vitejs/plugin-react | 6.1.1 | 2026-08-28 | VERIFIED | check compatibility with vite 8.3.1 at install |
| react-router-dom | 7.18.4 | 2026-09-15 | VERIFIED | |
| @tanstack/react-query | 5.104.0 | 2026-09-26 | VERIFIED | |
| @supabase/supabase-js | 2.117.2 | 2026-09-25 | VERIFIED | |
| zod | 4.6.5 | 2026-09-13 | VERIFIED | |
| vitest | 5.0.2 | 2026-09-25 | VERIFIED | |
| @playwright/test | 1.63.0 | 2026-09-04 | VERIFIED | |
| @testing-library/react | 16.3.3 | 2026-08-27 | VERIFIED | |
| eslint | 10.11.0 | 2026-09-18 | VERIFIED | |
| prettier | 3.9.9 | 2026-09-23 | VERIFIED | |
| tailwindcss (if chosen) | 4.3.3 | 2026-07-16 | VERIFIED | |
| supabase (CLI) | 2.118.0 | 2026-09-25 | VERIFIED | |
| Node.js | LTS line | – | TO RESOLVE | take current Active LTS from nodejs.org; record exact version |
| razorpay (Node, only if used server-side) | – | – | TO RESOLVE | Edge Functions run Deno: prefer plain `fetch` + HMAC verification; no SDK needed |

### Android
| Item | Pin | Status | Source / how to resolve |
|---|---|---|---|
| targetSdk | **36** | VERIFIED | Google Play "Target API level requirements" page: new apps & updates must target API 36+ from 2026-08-31 (checked 2026-10-11) |
| compileSdk | 36 (or higher if AGP requires) | VERIFIED (≥ target) | |
| minSdk | 26 | DEFAULT | decision, not a version lookup |
| Kotlin | 2.4.20 | VERIFIED | JetBrains/kotlin GitHub release, 2026-09-07 (newest 2.4.21 was <14 days old). Confirm AGP/Compose-compiler compatibility in P1-02 |
| Compose libraries | ui/foundation/runtime/animation **1.12.0**, material3 **1.4.0** | VERIFIED | developer.android.com Compose releases table, snapshot 2026-08-26 (alphas ignored) |
| Compose BOM coordinate | – | TO RESOLVE | look up the BOM that maps to Compose 1.12.0 on the official "Compose BOM mapping" page; do not guess the BOM string |
| Coil 3 | 3.6.3 | VERIFIED | coil-kt/coil GitHub release, 2026-09-18 (use `coil3` artifacts) |
| Ktor | 3.6.0 | VERIFIED (GitHub release 2026-09-18) | but **must match the version supabase-kt recommends** — resolve together with supabase-kt |
| MockK | 1.14.11 | VERIFIED | GitHub release 2026-05-29 |
| supabase-kt | – | TO RESOLVE | conflicting secondary sources (3.3.x vs 3.7.x seen). Resolve from Maven Central / the project's GitHub releases page; use BOM |
| Android Gradle Plugin | – | TO RESOLVE | take the version bundled with current stable Android Studio; must support compileSdk 36 |
| Gradle | – | TO RESOLVE | version required by the chosen AGP |
| JDK | – | TO RESOLVE | required by chosen AGP (17 or newer) |
| Hilt / Dagger | – | TO RESOLVE | official release page (GitHub API was rate-limited during lookup) |
| Navigation Compose, Room, DataStore, WorkManager, Lifecycle | – | TO RESOLVE | androidx release pages (stable only) |
| Firebase BoM (Messaging, Crashlytics, Analytics) | – | TO RESOLVE | Firebase Android release notes |
| kotlinx.serialization, kotlinx.coroutines, Turbine | – | TO RESOLVE | official releases; coroutines/serialization versions should match what supabase-kt/Ktor use |
| Razorpay Android SDK | – | TO RESOLVE | only after D-007 is confirmed; take from Razorpay's official docs |

### Other verified facts
- Native code & 16 KB page size: one secondary source says Play will refuse uploads without 16 KB support from 2027-02-01. **Unverified against the official page**; check at P10 (relevant only if any native `.so` libs are bundled).
- Verification limits: Maven Central/Google Maven were not reachable from the build sandbox, so Android versions marked TO RESOLVE must be read from Android Studio / official pages during P1-02.

**Phase 1 rule (P1-02):** after the project builds with these pins, change every `TO RESOLVE` cell to the real pinned value and add the date. Exit criterion: zero `TO RESOLVE` rows for items actually used.

## 10. External blockers checklist
SMS provider + DLT, payment account (KYC), Firebase project + `google-services.json`, Play Console account, domain for privacy/delete-account URLs, GST/FSSAI details.
