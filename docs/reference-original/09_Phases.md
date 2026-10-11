# 09_Phases — Boundaries, Entry/Exit Criteria

Unified sequence 0–10 (resolves the 7-phase vs 10-phase mismatch, gap G-02). Detailed tasks: `07_IMPLEMENTATIONPLAN.md`.

| Phase | Name | Entry criteria | Exit criteria (all must be evidenced in tracker) | Blocking externals |
|---|---|---|---|---|
| 0 | Audit | Docs present | Audit report delivered; project type confirmed; conflicts listed; first phase named | – |
| 1 | Foundation | P0 done, project type known | Android + web build; tabs navigate; theme tokens applied; CI runs; versions pinned | – |
| 2 | Backend & security | P1 done | Migrations apply clean from zero; RLS enabled on all user tables; pgTAP RLS tests pass; auth works (test OTP); no service key in clients | Supabase project |
| 3 | Core customer | P2 done | AC-01..04 satisfied with real Supabase data; screens have all states | Real OTP needs D-006 |
| 4 | Cart & checkout | P3 done | Server quote == displayed total; idempotent place-order test passes; COD works; online works in test mode with verified webhook | Payment account (D-007) |
| 5 | Order lifecycle | P4 done | State-machine tests pass; realtime + fallback verified; cancellation/refund flows work in test mode; push delivered to test device | Firebase, payment test |
| 6 | Reviews & loyalty | P5 done | Duplicate review blocked; aggregates correct; earn once; concurrent redeem test passes | – |
| 7 | Restaurant console | P5 done (can parallel P6) | Owner flows work; cross-restaurant access tests fail as expected (denied) | – |
| 8 | Admin | P7 done | Every admin action role-checked server-side + audited; non-admin denied (tested) | – |
| 9 | QA | P3–P8 done | Full suites green; security checklist done; a11y/small-screen pass; defects triaged | Test devices |
| 10 | Release prep | P9 done | Signed release AAB builds; demo data absent; Data Safety/privacy/deletion ready; runbook; legal items resolved | Play account, legal (D-009/D-010) |

## Rules
- **Only the human advances `CURRENT_PHASE`** (separate commit, after exit criteria are evidenced). AI tools never edit it; CI reads it from the base branch.
- `tools/file_registry.json` decides which paths unlock in which phase; keep it consistent with 07_IMPLEMENTATIONPLAN (human edits only).
- Do not start phase N+1 work during phase N, except documented parallelism (P6 ∥ P7).
- If an exit criterion cannot be met due to external blockers, mark `BLOCKED` or `IMPLEMENTED_UNVERIFIED` with the exact missing item; the phase may close as "conditionally complete" only with owner approval recorded in `10_memory.md`.
- Each phase ends with the report format in `12_PHASE_PROMPTS.md` §Report.
- Regression: after each phase, rerun all previous phases' tests.
