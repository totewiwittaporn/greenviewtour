# Tour settings validation — 2026-09-08

Base: main 73c52d0. Local-only implementation; GitHub push blocked by automatic approval review pending explicit owner approval. No hosted deployment.

- npm run check: PASS, ESLint, 36 Backend tests and both Vite builds.
- Prisma 7.10.0 validate/generate: PASS on owner's Windows Node 22.23.1 environment.
- Additive Prisma migration 20260908200000_tour_settings_agent_prices: applied to verified Greenview Preview.
- backend/scripts/check-tour-settings.js: PASS against real Preview. Seven private tables checked for RLS/client grant revocation. Create/read/update, foreign keys, distinct per-agent prices, optimistic conflicts, dependency guards and unique agent/program constraint exercised. All generated fixtures and audit events rolled back; all seven table counts remained zero.
- scripts/smoke-tour-settings.js: PASS in isolated Edge context at port 5274. All seven forms, required validation, failed save retention, discard confirmation, read-only View, reference selection, independent agent prices, search/clear, failed read retry, keyboard selection, 390px viewport, reduced motion. No real database writes.
- Desktop/mobile screenshots visually inspected. Empty money values remain Not set (including empty-string API responses); no implicit zero.
- Frontend Design Premium strict audit: zero findings. Shared Core controls and tokens retained; no colour/font changes. ReferenceField extends Core with bounded lookups rather than duplicating SelectField.

Booking inventory, online publication, payment, seasonal pricing and historical booking snapshots are outside this settings implementation. No customer, supplier or commercial price fixtures remain in Preview.
