# DEMO completion on Mac · 15 September 2026

Target: the owner's existing authenticated Chrome tab, localhost:5174. All persisted workflow mutations below were performed through the live UI and normal application HTTP requests. No password, permission, payment, migration, or non-DEMO record was changed.

## Completed example

Booking `BK-2026-000011`, `DEMO UI · มายมิลค์ทดสอบครบขั้นตอน 130926`, service date 20 September 2026, 2 adults and 1 child.

- An initial Complete request was rejected with the instruction to allocate journeys and record actual passengers.
- Recorded simulated actual passengers (2 adults, 1 child) for this booking only on ROAD-OUT, ROAD-BACK, SEA-OUT and SEA-BACK of DEMO-FLOW-260913.
- Returned adult lifejackets 2, child lifejacket 1, towels 3 and masks 3 to `DEMO FLOW · จุดรับคืนและทำความสะอาด`, disposition RETURN_CLEANING. Outstanding quantity became zero on all four lines.
- Settled water 6 bottles as CONSUMED. Outstanding quantity became zero.
- Complete succeeded. The live Booking Job Order showed COMPLETED, revision 3, and all four transport assignments.
- Stock movements search for BK-2026-000011 showed 10 entries: the five original issues and five new settlements, with quantities and destinations matching the UI actions. New entries explicitly identify simulated DEMO verification.
- Driver → Boat → Stock retained 20 September. Supplies → Loans retained the SEA-OUT boat selection.

## Verification boundaries

Before the owner clarified the requirement to work in their Chrome tab, a database transaction exercised completion guards, passenger actuals, stock settlement, duplicate command replay, over-return rejection, and completion. It passed and rolled back in full; it was not applied. All persisted changes were subsequently repeated through Chrome. The transaction verified unchanged price/payment fields; no payment action was performed during the browser run.

No application defect was reproduced in this tested completion path, so no application source was changed. The browser automation's date fill alone did not commit React state; native arrow-key input did, and the selected URL date was verified before writes. This is not evidence of a user-facing date defect.

This is one DEMO lifecycle, not full company acceptance testing. Returned equipment remains CLEANING and requires a later cleaning/readiness operation. No real journey, financial payment, email or LINE delivery is represented by this demonstration.
