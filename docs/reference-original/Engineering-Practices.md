# Engineering-Practices

## 1. Workflow
Branch per task (`feat/`, `fix/`, `db/`), small PRs, Conventional Commits, PR template with: scope, tests run (real output), migration impact, security impact, screenshots. No direct commits to `main`.

## 2. Kotlin/Android
- Follow Kotlin style + ktlint/detekt. Public APIs documented. No `!!` in production code.
- ViewModels expose immutable `StateFlow<UiState>`; one-off events via `Channel`/`SharedFlow`. No Context leaks.
- Repositories return `Result`/sealed `Resource`; map exceptions to domain errors with user-safe messages (Content.md).
- Coroutines: inject dispatchers; structured concurrency; cancel on lifecycle.
- Compose: stateless composables + hoisted state, `remember`/`derivedStateOf` appropriately, stable keys in lazy lists, previews for each component.
- No business-critical calculation in UI; display totals returned by server quote. Client estimate only for instant feedback and must be replaced.
- Resources: strings in `strings.xml`, dimens/tokens in theme. No hardcoded copy or colors.
- Release: R8 on, `debuggable=false`, no logging of PII/tokens, network security config (cleartext off), `allowBackup` reviewed, certificate pinning optional (evaluate).

## 3. TypeScript/Web
`strict` TS, Zod at boundaries, no `any`, ESLint+Prettier, TanStack Query for server state, error boundaries, role guards are UX-only.

## 4. SQL & migrations
- Append-only timestamped migrations via Supabase CLI; never edit applied files.
- Expand → backfill → contract for breaking changes; each destructive step needs approval (00_MASTER).
- Every table: RLS on, policies named `{table}_{role}_{action}`, explicit `to authenticated`, `using` and `with check`.
- `SECURITY DEFINER` functions: `set search_path = public`, check `auth.uid()` and role inside, minimal grants, revoke from `public`.
- Use constraints for invariants (check, unique, FK) before application checks.
- Lint with `supabase db lint`; test RLS with pgTAP (impersonate roles).

## 5. Security checklist (every PR touching data/auth/payments)
- [ ] No secret in client/repo (gitleaks passes)
- [ ] Server recalculates money; client values ignored
- [ ] RLS policy + test added/updated
- [ ] Ownership check in function
- [ ] Input validated (length, range, format); output encoded
- [ ] Rate limiting considered
- [ ] Idempotency for repeatable mutations
- [ ] Logs free of PII/secrets
- [ ] Webhook signatures verified, replay-safe
- [ ] Audit log for privileged actions

## 6. Testing standards
| Level | Tools | Must cover |
|---|---|---|
| Unit (Android) | JUnit, MockK, Turbine | pricing display, cart rules, validators, ViewModels, repositories (fake) |
| Unit (web) | Vitest | formatters, guards, forms |
| DB | pgTAP | RLS per table/role, constraints, ledger uniqueness, state-transition function, concurrency (parallel redemption via two sessions/psql scripts) |
| Functions | Deno test + local stack | quote, place-order idempotency, webhook signature + replay, refund, transitions |
| Android UI | Compose test / Maestro | login, search, add to cart w/ customization, checkout (test mode), tracking, small screen + font scale 2.0 |
| E2E web | Playwright | restaurant accept flow, admin restrictions |
| Non-functional | Lint, a11y checks (Accessibility Scanner), contrast | |
Rules: tests run against local/staging only; never claim pass without output; flaky tests fixed or quarantined with a tracker entry; destructive/payment tests never on prod.

## 7. Error handling & logging
Typed errors; user message from Content.md; correlation id in function logs; log levels; never log OTPs, tokens, full phone, addresses, card data. Crashlytics non-fatal for unexpected states.

## 8. Performance
Pagination everywhere (default 20), keyset for big lists, debounce 300 ms, cancel in-flight search, image sizing, avoid recomposition storms (stable params), baseline profile for release (optional), measure startup.

## 9. CI gates (block merge)
lint, unit tests, build, pgTAP, function tests, secret scan, dependency vulnerability check, "no demo data in release variant" check.

## 10. Documentation
Update the relevant doc and `10_memory.md` in the same PR as the change; tracker only after verification.

## 11. Dependency policy
Prefer official/maintained libs; pin versions; justify any new dependency in PR; no abandoned libs; check licences.
