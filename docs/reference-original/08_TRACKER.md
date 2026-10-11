# 08_TRACKER — Live Status

Update ONLY after verification. Status values: `NOT_STARTED`, `IN_PROGRESS`, `DONE_VERIFIED`, `IMPLEMENTED_UNVERIFIED`, `PARTIAL`, `BLOCKED`, `CONFLICT`.
Columns: Task | Feature | Status | Files changed | Migration/backend | Tests run & result | Remaining issues | External config | Next

## Pre-flight (external items, owner action)
| ID | Item | Status | Notes |
|---|---|---|---|
| X-01 | Confirm project type (native Android supported?) | NOT_STARTED | P0-01 |
| X-02 | Supabase local + staging project | NOT_STARTED | |
| X-03 | SMS provider + TRAI DLT (D-006) | BLOCKED | owner |
| X-04 | Payment gateway account + test keys (D-007) | BLOCKED | owner |
| X-05 | Firebase project + google-services.json | BLOCKED | owner |
| X-06 | Play Console account | BLOCKED | owner |
| X-07 | GST/FSSAI/legal inputs (D-009/D-010) | BLOCKED | CA/lawyer |
| X-08 | Domain for privacy + deletion pages | BLOCKED | owner |

## Phase 0 — Audit
| Task | Feature | Status | Evidence |
|---|---|---|---|
| P0-01 | Project type confirmed | NOT_STARTED | |
| P0-02 | Docs read & matrix | NOT_STARTED | |
| P0-03 | Code/build inspection | NOT_STARTED | |
| P0-04 | Audit report | NOT_STARTED | |

## Phase 1 — Foundation
| Task | Feature | Status | Evidence |
|---|---|---|---|
| P1-01 | Repo structure | NOT_STARTED | |
| P1-02 | Android project + pinned versions | NOT_STARTED | |
| P1-03 | Theme/tokens | NOT_STARTED | |
| P1-04 | Navigation | NOT_STARTED | |
| P1-05 | Core components | NOT_STARTED | |
| P1-06 | Variants/Hilt/config | NOT_STARTED | |
| P1-07 | Web skeleton | NOT_STARTED | |
| P1-08 | CI | NOT_STARTED | |

## Phase 2 — Backend & security
P2-01 Migrations — `PARTIAL`: 001–003 written and applied on plain PostgreSQL 16 + PostGIS 3.4 with 18/18 smoke checks passing (tests/01_schema_smoke.sql); 004–006 not written; **not yet run with Supabase CLI** · P2-02 RLS+storage · P2-03 pgTAP · P2-04 Auth/profile trigger · P2-05 Android data layer · P2-06 Seed — all `NOT_STARTED`.

## Phase 3 — Core customer
P3-01 Auth screens · P3-02 Addresses · P3-03 Home · P3-04 Search · P3-05 Restaurant · P3-06 Customization · P3-07 Favorites — all `NOT_STARTED`.

## Phase 4 — Cart & checkout
P4-01 Local cart · P4-02 quote-cart · P4-03 Coupons · P4-04 place-order idempotent · P4-05 COD · P4-06 Online payment (BLOCKED on X-04) · P4-07 Checkout UI — `NOT_STARTED` (P4-06 `BLOCKED`).

## Phase 5 — Order lifecycle
P5-01 Transitions · P5-02 Tracking/Realtime · P5-03 History/reorder · P5-04 Cancel/refund/timeouts · P5-05 FCM (BLOCKED on X-05) — `NOT_STARTED`.

## Phase 6 — Reviews & loyalty
P6-01 Reviews · P6-02 Ledger/earn/redeem · P6-03 Rewards UI · P6-04 Concurrency tests — `NOT_STARTED`.

## Phase 7 — Restaurant console
P7-01..P7-06 — `NOT_STARTED`.

## Phase 8 — Admin
P8-01..P8-11 — `NOT_STARTED`.

## Phase 9 — QA
P9-01..P9-05 — `NOT_STARTED`.

## Phase 10 — Release
P10-01..P10-07 — `NOT_STARTED`.

## Acceptance criteria tracker (PRD §6)
AC-01..AC-13 — all `NOT_STARTED`.

## Final status matrix (fill at Phase 10)
Implemented & tested: — · Implemented, awaiting external config: — · Partially implemented: — · Not implemented: —

## Change log
| Date | Who | Change |
|---|---|---|
| (init) | docs | Tracker created, all NOT_STARTED |
