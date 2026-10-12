# Five critical gaps — implementation and verification

Only Food-prefixed objects/private Food schema were deployed. Applied migrations were not edited. Shared Auth settings, Salon/Jobs objects and payment code were not modified. Existing GitHub Commercials code/configuration was preserved; its non-Food migration is not applied by this change and is excluded from Food's isolated database CI.

| Gap | Implementation / main files | Manual verification |
|---|---|---|
| G-01 | `20261012090000_food_push_delivery.sql`, `send-notification/index.ts`, scheduler migration | Configure Firebase/Vault/pg_net, transition an owned test order, inspect Food deliveries. Service worker requests accept notification ID only; token results contain IDs/statuses, no token/PII. |
| G-02 | token RPCs, `web/src/push.ts`, `NotificationPermission.tsx`, bundled Firebase worker, Android `push/*` | Complete first live order; opt in from Updates/Android Account. Denied/unsupported/unconfigured states remain honest. Sign out unregisters. Foreground/login refresh checks owned orders and updates token binding. |
| G-03 | `20261012090100_food_account_deletion.sql`, `process-deletion/index.ts`, `DeletionAdmin.tsx` | Review retention policy as Super Admin, configure scheduler, submit eligible test request. Confirm blockers, database/storage/Auth stages and final audit. Never test by deleting an owner's real account. |
| G-04 | `AccountDeletion.tsx`, receipt migration, Android repository/viewmodel/dialog | Re-enter password, type DELETE; inspect dates/status; cancel before processing. Recent signed password AMR is checked server-side. A 14-day hashed receipt observes completion after Auth removal. |
| G-05 | `LegalPages.tsx`, auth/footer/profile/checkout links, public-deletion function and challenge migration | Open `/#/terms`, `/#/privacy`, `/#/refund-policy`, `/#/delete-account` logged out. Email flow needs security check, verified email link and DELETE; challenge is single-use and expires after 30 minutes. |

## Limits and prerequisites
- Firebase service account in the `FIREBASE_SERVICE_ACCOUNT` Edge secret; matching Firebase Web project config and public VAPID key in build environment. Provider delivery has not been tested with real credentials.
- Android `google-services.json` must be supplied privately at build time for the correct debug/release application IDs. Gradle reads that file into public Firebase options; no global Google plugin/Auth changes. Runtime Android 13+ permission and channel are implemented. Missing configuration does not crash.
- Resend verified sender/domain, `RESEND_API_KEY`, `FOOD_DELETION_EMAIL_FROM`, Turnstile site/secret keys and a random `FOOD_RATE_LIMIT_PEPPER`. `WEB_ORIGIN` must match this Site. No actual verification email was sent. Shared Supabase Auth email/SMS settings were not changed.
- Owner must enable `pg_net` in the shared project and populate Vault entries `nexora_food_project_url` and `nexora_food_service_role` privately. Vault exists; pg_net was absent at inspection. The Food cron job is installed but safely does nothing without all prerequisites. No keys appear in SQL.
- Owner/legal must supply legal entity, address and grievance contacts, approve the draft texts, and set a reviewed financial-retention period/public explanation. Deletion completion stays disabled until review. Retained financial records are anonymized; automatic financial-record expiry/purge is not implemented and remains an owner/legal operational responsibility.
- Other-product FK references block shared Auth account removal (`shared_account_coordination_required`). This preserves Salon/Jobs accounts. Cross-product deletion must be coordinated separately; this worker will not cascade through their rows.
- FCM has no transaction with Postgres. Confirmed transient failures retry with capped exponential backoff. A timeout/crash after a send is ambiguous; it is marked unknown and never automatically resent, so notifications may be missed instead of duplicated. Clients dedupe by notification ID. Provider acceptance does not prove delivery to a physical device.
- Empty, missing or expired receipts expose no personal data and never authorize deletion. Requests and cancellation are authenticated; public requests require email control. The receipt is a status-only bearer secret, stored hashed server-side and memory/private app storage client-side.

## What ran
- `npm ci --offline` succeeded from the completed npm cache; `npm test`: 124 passed; TypeScript/Vite production build passed before final packaging.
- Initial transactional critical-gap suite passed against the connected live schema and rolled back all fixtures: token RLS, invalidation, queue dedupe, zero-token state, active-order and last-admin blockers, cancellation and shared-account protection.
- The extended receipt/email-verification SQL rerun could not return a result through MCP (invalid/expired requestState twice). Its isolated full-anonymization/Auth-fixture completion branch is queued in GitHub database CI; no full live account deletion is claimed.
- Six new migrations and three Food Edge Functions deployed successfully. No real FCM send, email delivery, avatar cleanup or Auth deletion was executed.
- Browser legal/deletion tests, Deno checks and Android JVM/build/device jobs are configured in GitHub CI. Their current results must be read from the corresponding new run before claiming success. No local browser/emulator was available.
