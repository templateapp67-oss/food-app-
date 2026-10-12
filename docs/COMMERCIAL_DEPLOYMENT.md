# Commercial workspace publication — 2026-10-12

Entry point: https://nexora-food.templateapp67.chatgpt.site/#/commercial

The GitHub module was already present in Sites source. This publication rebuilds and publishes it, refreshes the offline shell, adds an explicit sample-workspace notice and an app-update control, and tests direct entry, dropdown entry, eight tabs, reload, Hindi and responsive width on three browser profiles.

The module includes a payout calculator, onboarding pipeline, commercial plan editor, agreement/print preview, legal review, partner portal, admin preview and notification templates. The role selector changes the sample preview only; it does not grant Supabase roles.

## Data boundary
Applications, plans, clauses, statements, disputes and commercial audit entries are held in component state using labelled sample seeds. Refresh resets those edits. They are not connected to the production commercial tables. The existing database migration was not applied: it uses non-Food names, references roles not present in the current Food role enum, and includes unapproved example subscription, gateway and tax defaults. Publishing this UI does not activate fees, approve restaurants, settle payments or send messages.

Production persistence, server-side commercial RBAC, document-storage verification, agreement acceptance/versioning and reviewed commercial/tax configuration need a separate backend implementation before this preview can be used for real partner contracts. COD order handling and existing Food dashboards remain separate.

## Checks
124 unit tests and TypeScript/Vite build passed. Six additional browser cases (two across three profiles) are in `qa/browser/tests/commercial.spec.ts`. CI run: https://github.com/templateapp67-oss/food-app-/actions/runs/38257670144 . Check its final result before describing browser verification as passed.
