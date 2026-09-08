# Settings refinements — 2026-09-08

Owner authorized GitHub push/PR and the shared address, company-form, placeholder and persistent-navigation refinements.

- ESLint and 39 Backend tests: PASS.
- Public and Backoffice builds: PASS.
- Prisma validate/generate and additive structured-address migration: PASS on verified Greenview Preview.
- Real Preview rollback test: PASS, including company/partner/pickup persistence, structured employee profile, unchanged legacy address, existing price isolation and constraints. All fixtures/audits rolled back; no production writes.
- Isolated Edge test `smoke-settings-refinements.js`: PASS. Singleton company form, field order, native placeholder lifecycle, safe Maps links, failed-save retention, unchanged Shell DOM and no account refetch on route changes, dirty link/back/forward protection, profile save and mobile form reachability.
- Existing settings CRUD fixture suite: PASS with the company form refinement.
- Premium UI strict audit: zero findings. Desktop/mobile screenshot review performed; Company padding and field grouping refined using existing tokens.

Addresses are typed, ordered fields. No linked province/district dataset is claimed. Google Maps is opened through explicit external links, without API keys or automatic geocoding. Saved map links take priority over optional coordinates.
