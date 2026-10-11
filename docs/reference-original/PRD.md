# PRD — Product Requirements

## 1. Vision
Reliable, fast, original-brand food ordering for Indian cities, starting with a limited service area.

## 2. Personas
| Persona | Needs |
|---|---|
| Customer | Find food fast, trust prices, track order, reorder, earn rewards |
| Restaurant owner / staff | Receive orders loudly & reliably, manage menu/availability, see sales |
| Delivery partner (minimal v1) | See assigned order, pickup/delivered updates |
| Support agent | Look up orders/customers, handle tickets, limited refunds |
| Admin / super_admin | Control restaurants, promos, zones, settings, audit |

## 3. Features and priority
P0 = launch blocker, P1 = launch if time, P2 = post-launch.

| ID | Feature | P |
|---|---|---|
| F-01 | Phone OTP auth, session persistence, profile | P0 |
| F-02 | Onboarding + splash | P1 |
| F-03 | Home discovery (categories, sections, banners) from Supabase | P0 |
| F-04 | Search (restaurants, dishes, cuisines), filters, sort, recent searches | P0 |
| F-05 | Restaurant detail + menu + customization | P0 |
| F-06 | Cart (single restaurant, persisted, server-validated) | P0 |
| F-07 | Addresses + serviceability check | P0 |
| F-08 | Checkout: COD + online payment, idempotent | P0 |
| F-09 | Order tracking (status-based, Realtime + fallback) | P0 |
| F-10 | Order history, reorder, cancel | P0 |
| F-11 | FCM order notifications | P0 |
| F-12 | Restaurant console (orders, menu, hours, availability) | P0 |
| F-13 | Admin dashboard core (restaurants, orders, customers, settings) | P0 |
| F-14 | Coupons | P1 |
| F-15 | Reviews (restaurant + item), verified purchase, report | P1 |
| F-16 | Favorites | P1 |
| F-17 | Loyalty (ledger, earn, redeem, tiers) | P1 |
| F-18 | Refunds (full/partial via gateway) | P0 |
| F-19 | Support tickets | P1 |
| F-20 | Account deletion request | P0 (Play policy) |
| F-21 | Hindi localization | P2 |
| F-22 | Rider minimal view | P1 (D-004) |
| F-23 | Settlement reports | P1 |
| F-24 | Analytics/crash reporting | P1 |

## 4. Functional requirements
Each requirement maps to `06_RULES.md` sections; acceptance IDs are in §6.

## 5. Non-functional requirements
- **Performance:** home first content < 2.5 s on 4G mid-range device; list pagination 20 per page; search debounce 300 ms.
- **Reliability:** checkout retry-safe (idempotent); realtime fallback polling; offline shows cached restaurants/cart read-only.
- **Security:** RLS everywhere, server-authoritative pricing, no secrets in clients, rate limiting on OTP/checkout/review.
- **Privacy:** DPDP-aligned consent, minimal PII in logs and notifications, deletion workflow.
- **Accessibility:** WCAG AA contrast, 48dp targets, TalkBack labels, font scaling to 200%.
- **Compatibility:** Android minSdk per `04_TECHSPEC`; phones primarily, tablets tolerated.
- **Scalability:** indexed queries, no full-table loads, pagination everywhere.

## 6. Acceptance criteria (summary; detailed ones in 11_SCREENS and 06_RULES)
AC-01 Register/sign in with OTP; wrong/expired OTP handled; session survives restart.
AC-02 Home/restaurant/menu data come from Supabase (seed flagged as demo in dev).
AC-03 Search results are real queries; filters and sorts change results.
AC-04 Customization validation blocks invalid add-to-cart.
AC-05 Cart totals shown equal server-computed totals at checkout (mismatch → refreshed + notice).
AC-06 Same checkout submitted twice creates one order.
AC-07 Online order is `paid` only after verified webhook/server verification.
AC-08 Only legal status transitions by authorized role succeed (tested).
AC-09 Loyalty points awarded exactly once per eligible delivered order; concurrent redemption cannot overspend.
AC-10 Customer cannot read/write another user's data; owner cannot touch other restaurants (RLS tests pass).
AC-11 Push arrives for confirmed/out-for-delivery/delivered and deep-links to that order only if owner.
AC-12 Account deletion request creates tracked request; PII handled per policy.
AC-13 No secret present in APK/web bundle (scan step in CI).
