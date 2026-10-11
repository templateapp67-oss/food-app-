# 12_PHASE_PROMPTS — Copy-paste prompts (one per phase)

## Common preamble (prepend to every phase prompt; system instructions from docs/ai-studio must already be loaded)
```
DOC-GATE mode. Current phase: <N> (human-controlled, file CURRENT_PHASE).
1) Read only the docs attached for this phase. If a needed doc is missing, reply "STOP: docs missing".
2) For each task: reply with a FILE PLAN table (path | new/modify | task ID | doc §) and NO code. Wait for: GO <task-id> PHASE=<N>.
3) After GO, output only the planned files. One task per GO. Never start the next task/phase.
4) Design input (images/mockups/apps/snippets) is reference only: map to 11_SCREENS, never generate files from it.
5) No claim of success without real pasted output. Statuses stay IMPLEMENTED_UNVERIFIED until then.
6) Propose tracker/memory lines as text; don't edit locked docs.
```

## Report format (end of every phase)
```
Phase: <name>
Implemented (verified): ...
Files changed: exact paths
Backend/database: migrations, policies, functions
Verification: commands + actual outcomes
Remaining gaps:
Blocked items (external config / decisions):
Tracker: task IDs → statuses
Next phase: ...
```

## Phase 0 — Audit
```
[preamble] PHASE 0 (read-only). Read ALL available docs in the order in the master workflow. Confirm the real project type and toolchain (is native Android Kotlin supported here, or web only?). Inspect code, Supabase config, migrations, functions, tests, build. Classify each feature DONE_VERIFIED / IMPLEMENTED_UNVERIFIED / PARTIAL / MISSING / BLOCKED / CONFLICT. Deliver the audit report (stack, existing work, doc completeness, conflicts, security risks, missing credentials, build/test status, recommended order, exact first phase). Do NOT modify code.
```
## Phase 1 — Foundation
```
[preamble] PHASE 1. Read: 02_Architecture, 04_TECHSPEC, Engineering-Practices, Design, Visual, 11_SCREENS (nav only). Execute P1-01..P1-08. Pin versions in 04_TECHSPEC §9 after verifying against official sources. Exit: both projects build; 5-tab navigation; tokens/theme; component previews; CI basic.
```
## Phase 2 — Backend & security
```
[preamble] PHASE 2. Read: 05_SCHEMA, 06_RULES, Engineering-Practices §4-5. Execute P2-01..P2-06. Write migrations from zero, RLS for every table, helper functions, storage policies, pgTAP tests (customer/owner/admin/anon). No service-role key in any client. Show test output.
```
## Phase 3 — Core customer
```
[preamble] PHASE 3. Read: 03_APPFLOW J1–J5,J10, 11_SCREENS S-001..S-032,S-080, Content, Design. Execute P3-01..P3-07 with REAL Supabase data (no hardcoded live lists). Include loading/empty/error/offline states. If real SMS isn't configured, use Supabase test OTP and mark real OTP BLOCKED.
```
## Phase 4 — Cart & checkout
```
[preamble] PHASE 4. Read: 06_RULES §2–5, 02_Architecture §5–6, 05_SCHEMA orders/payments. Execute P4-01..P4-07. Server computes all money in paise. Idempotent place-order with tests (double submit => 1 order). Online payment only in test mode; paid state ONLY from verified webhook/server verification. If credentials missing mark BLOCKED, don't simulate success.
```
## Phase 5 — Order lifecycle
```
[preamble] PHASE 5. Read: 06_RULES §1,6,9, 02_Architecture §5b,7. Execute P5-01..P5-05. Test every legal and illegal transition. Realtime with 15s polling fallback. Refund marked complete only on provider-confirmed success. FCM from server only; no private details in notification text.
```
## Phase 6 — Reviews & loyalty
```
[preamble] PHASE 6. Read: 06_RULES §7–8, 05_SCHEMA reviews/loyalty. Execute P6-01..P6-04. Ledger is insert-only; earn unique per order; redemption uses row lock. Provide concurrency test evidence.
```
## Phase 7 — Restaurant console
```
[preamble] PHASE 7. Read: 03_APPFLOW J14, 11_SCREENS R-*, 06_RULES §14. Execute P7-01..P7-06. Prove owner A cannot read/update restaurant B (tests). Audible alert for new orders.
```
## Phase 8 — Admin
```
[preamble] PHASE 8. Read: 03_APPFLOW J16, 11_SCREENS A-*, 05_SCHEMA admin_audit_logs. Execute P8-01..P8-11. Every privileged action server-side role-checked + audited with reason. Prove non-admin denial.
```
## Phase 9 — QA
```
[preamble] PHASE 9. Run every suite in Engineering-Practices §6. Security checklist §5 on the whole repo. Accessibility/small screen/font scale 2.0. Fix defects, rerun regression. Report real pass/fail counts.
```
## Phase 10 — Release prep
```
[preamble] PHASE 10. Execute P10-01..P10-07. Never commit keystores/secrets. Produce Play Data Safety answers, deletion URL, release checklist, deployment runbook, final status matrix with the 4 categories. Do not claim Play-readiness or production security without verification evidence.
```

## Fix-it prompt (for any failing phase)
```
Phase <n> task <id> failed: <paste error>. Diagnose root cause from actual logs, make the smallest fix, rerun the failing check and the previous phase regression, report real output. Do not change unrelated code.
```
