# Equipment returns · 15 September 2026

Owner requested removal of separate equipment washing reports and included future features subject to incremental policy decisions.

## Implemented

- All three return forms offer ready/damaged/lost outcomes without RETURN_CLEANING; boat equipment defaults to ready.
- Server rejects new RETURN_CLEANING settlement and new CLEANING condition transitions. Existing transaction replay and historical records are preserved.
- Existing CLEANING stock can still transition to READY/DAMAGED through the standard condition command. No balances or history were bulk changed.
- Housekeeping zone work remains distinct.
- Thai system manual: docs/user-manual-th.md.

## Evidence and remaining verification

- npm run check passed: lint, 142 backend tests, 5 frontend tests and both builds before the additional regression test.
- Targeted boat-stock-preparation suite passed 13/13 including the new ready-return, retired-cleaning rejection and over-return regression.
- Premium strict static audit: 0 findings. Static audit does not prove browser behavior.
- User Chrome inventory displayed 4 historical cleaning balances. Page still showed the former label before restarting Local.
- Restarted Local; owner signed in again. Chrome displayed the new Legacy cleaning balances label and the condition dropdown offered only Ready/Damaged. Saved one DEMO towel from CLEANING to READY through Chrome; success message appeared and legacy towel quantity decreased from 6 to 5.
- Chrome boat return form defaults to Return ready and offers only Return ready, Return damaged and Lost / wasted for equipment. Returned one DEMO towel on BK-2026-000004; outstanding decreased from 3 to 2. Both mutations include explicit simulated verification notes.
- No commit/push or deployment. Only the two DEMO stock transactions described above were persisted during this change.
- Final lint and backoffice build passed after the label change.

## Next decisions

Negotiated Agent price approval policy is pending owner response. Evidence uploads/contracts, accounting policies and hosted LINE delivery need separate concrete requirements. They are included in the future scope, not delivered by this change.
