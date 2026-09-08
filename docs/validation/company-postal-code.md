# Address fields and automatic postal code

2026-09-08. Restored visible editable Company address fields. Quick address remains optional; Save address applies the modal draft to those fields without an API write. Postal code is read-only and derived for both manual and modal entry. Parent mismatches clear stale postal codes. Known Ao Nang postal areas additionally use Moo; unknown Moo does not guess a code.

Validation: npm run check passed (lint, 45 backend tests, both frontend builds). Edge Company smoke passed manual entry, automatic postal changes, optional Quick address, draft discard, map validation, save errors, navigation and narrow layout. Desktop form and narrow dropdown inspected. Preview migration and generated Prisma client passed; rollback integration verified Company postal write/read, forged postal replacement, partner/profile postal persistence, existing data retention and authorization. Fixtures rolled back.

The pinned community dataset is not a live postal authority service; reviewed local delivery corrections and sources are documented in packages/contracts/data/README.md. The existing lazy dataset build-size warning remains. No production deployment or bulk data rewrite.
