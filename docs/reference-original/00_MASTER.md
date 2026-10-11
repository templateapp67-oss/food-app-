# 00_MASTER — Project Constitution

> This file is the highest authority in the documentation set. If any other file contradicts it, this file wins unless a newer entry in `10_memory.md` (Decision Log) explicitly supersedes it and is marked APPROVED.

## 1. Project identity
- **Product:** Food delivery platform for India. Working brand: **Mealora** (name is a config value, never hardcode in logic).
- **Components:** (1) Customer Android app, (2) Web portal = Restaurant console + Admin dashboard (role-gated, one React app), (3) Supabase backend (Postgres, Auth, Storage, Realtime, Edge Functions), (4) Optional minimal Rider view (see D-004).
- **Primary objective:** A genuinely working, secure, maintainable ordering platform — not a set of mockups.

## 2. Documentation map (18 files, note: there is intentionally no `01_` file)
| File | Purpose |
|---|---|
| 00_MASTER | Authority, rules, conflict resolution |
| Build_Brief | Scope, environment, limits, gap analysis |
| PRD | Product requirements & acceptance criteria |
| 10_memory | Decision log, rejected approaches, known issues |
| 02_Architecture | System design, modules, data flow |
| 04_TECHSPEC | Stack, libraries, config, environments |
| Engineering-Practices | Code, security, testing, migration standards |
| 03_APPFLOW | User journeys incl. failure paths |
| 11_SCREENS | Screen inventory with states |
| Design | Design system rules & components |
| Visual | Brand, palette, imagery, accessibility |
| Content | Copy, errors, notifications |
| 05_SCHEMA | Database, RLS, functions |
| 06_RULES | Business rules, state machines, formulas |
| 07_IMPLEMENTATIONPLAN | Ordered task plan |
| 09_Phases | Phase entry/exit criteria |
| 12_PHASE_PROMPTS | Copy-paste prompt per phase |
| 08_TRACKER | Live status (only updated after verification) |

## 3. Authority order (conflict resolution)
1. `00_MASTER.md`
2. APPROVED entries in `10_memory.md` Decision Log (newest wins per topic)
3. `06_RULES.md` (business logic) and `05_SCHEMA.md` (data) — these two must never disagree; if they do, STOP and raise a CONFLICT.
4. `02_Architecture.md`, `04_TECHSPEC.md`, `Engineering-Practices.md`
5. `PRD.md`, `03_APPFLOW.md`, `11_SCREENS.md`
6. `Design.md`, `Visual.md`, `Content.md`
7. `07_IMPLEMENTATIONPLAN.md`, `09_Phases.md`, `12_PHASE_PROMPTS.md`, `08_TRACKER.md`

Conflicts touching security, money, migrations, or data integrity: **stop that work, log in `10_memory.md` as CONFLICT, ask the owner.** Never silently pick.

## 4. Global rules (non-negotiable)
1. Never fabricate: credentials, API behavior, test results, build success, or integrations.
2. No privileged secret in APK, web bundle, git, or client-readable rows (service-role key, payment secret, Firebase service account, SMS provider keys).
3. Server is authoritative for: prices, taxes, discounts, coupons, loyalty, payment status, order transitions, refunds.
4. Money is stored as **integer paise** (`*_paise bigint`), currency `INR`. No floats anywhere.
5. Every user-facing table has RLS enabled; every policy has a test.
6. One phase at a time. Verify → update tracker → stop.
7. Preserve working code; smallest safe change; non-destructive migrations only (expand → migrate → contract).
8. No competitor branding, text, or artwork.
9. Demo/seed data must be labelled and excluded from release builds.
10. Status vocabulary (use exactly): `DONE_VERIFIED`, `IMPLEMENTED_UNVERIFIED`, `PARTIAL`, `MISSING`, `BLOCKED`, `CONFLICT`.

## 4b. Documentation Gate (applies to any AI tool, incl. Google AI Studio)
11. **No file is created or changed unless** it belongs to ONE task in `07_IMPLEMENTATIONPLAN.md`, the task's phase equals `CURRENT_PHASE`, and the path is allowed by `tools/file_registry.json`.
12. Flow is always **PLAN (file table, no code) → human `GO <task-id> PHASE=<n>` → build only the planned files**. One task per GO.
13. **Design input is reference only.** Screenshots, mockups, competitor apps, pasted code or app descriptions never trigger code/file generation; they only produce a mapping to `11_SCREENS.md` and proposed doc edits.
14. Only the human changes `CURRENT_PHASE`, `tools/**`, the registry, and locked docs. AI may only *propose* text for `08_TRACKER.md` and `10_memory.md`.
15. AI cannot self-certify: statuses stay `IMPLEMENTED_UNVERIFIED` until the human pastes real build/test output.
16. External enforcement: `python3 tools/gate_check.py` locally and the `doc-gate` GitHub Action (reads phase and rules from the base branch). Violations are discarded, not merged.
Details: `docs/ai-studio/SETUP_GUIDE.md`, `SYSTEM_INSTRUCTIONS.md`, `GATE_SELF_TEST.md`.

## 5. Definition of Done (per task)
Code merged-ready, builds, tests written and executed with real output, RLS/permissions checked if data touched, copy from `Content.md`, states (loading/empty/error) present, tracker updated with evidence.

## 6. Environments
`local` (Supabase CLI) → `staging` (separate Supabase project, test payment keys) → `production`. Destructive tests only on local/staging.

## 7. Open founder decisions
Tracked in `10_memory.md` as `PENDING`. Work depending on a PENDING decision is `BLOCKED` unless a documented default exists.
