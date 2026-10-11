# 10_memory — Decision Log & Project Memory

> Read fully before every phase. Add entries; never delete — mark `SUPERSEDED by D-xxx`.
> Status: `APPROVED` | `DEFAULT` (assumed until owner decides) | `PENDING` (needs owner) | `SUPERSEDED`.

## Decision log
| ID | Decision | Status | Notes |
|---|---|---|---|
| D-001 | Native Android = Kotlin + Compose + MVVM; web = React+TS | APPROVED | from master prompt |
| D-002 | Backend = Supabase; sensitive logic in Edge Functions + Postgres RPC (SECURITY DEFINER with explicit checks) | APPROVED | |
| D-003 | Money in integer paise, INR | DEFAULT | 06_RULES §Pricing |
| D-004 | v1 delivery: no native rider app. Admin/restaurant assigns rider; rider uses minimal web view (accept, picked up, delivered). | DEFAULT | Founder to confirm |
| D-005 | Restaurant console is a role-gated route of the web portal, not an Android app | DEFAULT | |
| D-006 | SMS provider for OTP (e.g., a TRAI-DLT-registered provider via Supabase phone auth) | PENDING | Blocks real OTP |
| D-007 | Payment gateway = Razorpay (test mode first) | DEFAULT | Confirm; Cashfree/PhonePe alternatives |
| D-008 | Serviceability via PostGIS radius/polygon zones; distance by haversine (straight-line) for fees in v1 | DEFAULT | Road distance later |
| D-009 | GST/tax rates, invoice format, FSSAI display | PENDING | Needs CA |
| D-010 | Privacy policy/ToS/refund policy text | PENDING | Needs lawyer; Content.md has placeholders only |
| D-011 | Restaurant payouts manual in v1 with settlement report | DEFAULT | |
| D-012 | Reviews: verified purchase only; one review per (order, restaurant) and per (order_item); edit within 24 h; no delete by user | DEFAULT | |
| D-013 | Cancellation: free until restaurant `preparing`; after that no customer cancel (support/admin only) | DEFAULT | Configurable |
| D-014 | Loyalty: earn on `delivered`; 1 pt per ₹100 eligible; 100 pt = ₹10; max 20% of items subtotal; min redeem 100 pts; expiry 365 days | DEFAULT | All in `app_settings` |
| D-015 | Accent button text uses dark `#101114` (contrast) | APPROVED | Visual.md |
| D-016 | Cart: local (Room/DataStore) + synced to server only at checkout validation; server cart table optional (P2) | DEFAULT | Simplifies conflicts |
| D-017 | Search = Postgres pg_trgm + FTS, no external search service in v1 | DEFAULT | |
| D-018 | English first; Hindi strings via resources in P2 | DEFAULT | |
| D-019 | Variants store `price_delta_paise` (not absolute price) | APPROVED | matches 06_RULES pricing formula; implemented in migration 003 |
| D-020 | targetSdk 36 | APPROVED | Google Play requirement since 2026-08-31 (verified 2026-10-11) |
| D-021 | Tables get RLS enabled at creation (deny-all) and policies arrive in migration 007 | APPROVED | safe by default; Supabase exposes public tables via API |
| D-022 | Plain-Postgres test harness stubs `auth` schema (tests/00_local_stub_auth.sql); real verification still needs `supabase db reset` | APPROVED | |
| D-023 | Documentation Gate: PLAN→GO tokens, design input = reference only, external `gate_check.py` + CI enforcement | APPROVED | AI Studio over-generates a full app from any design hint |
| D-024 | Prefer chat-mode code generation copied into the repo; Android is built in Android Studio | DEFAULT | Build mode is higher risk |

## Rejected approaches
- Trusting client-reported payment success. Rejected: security.
- Mutable `loyalty_balance` as sole source. Rejected: use ledger (+ derived/cached balance).
- Letting the AI tool advance phases or edit locked docs/registry. Rejected: gate bypass.
- Fake moving map marker. Rejected: no GPS in v1.
- Hardcoded lists shown as live data. Rejected.
- Storing floats for money. Rejected.

## Known issues / limitations
(Fill after audit. Format: `K-001 | area | description | status`.)

## Completed work
(Mirror of verified items from 08_TRACKER; keep short.)

## Open questions for owner
1. Launch city and service-area boundaries? 2. Commission % and delivery fee slabs? 3. COD allowed? max COD amount? 4. SMS provider and DLT status? 5. Payment gateway account ready? 6. Legal entity, GSTIN, FSSAI handling? 7. Own riders or third-party?
