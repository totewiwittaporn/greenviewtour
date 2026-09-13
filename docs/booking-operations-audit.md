# Booking → Operations dataflow audit

Scope: repository source review and local unit checks during the Booking/Operations implementation. This report does not assert that migrations, deployment, a live browser session, or database concurrency tests have completed. It describes the working branch, including the coordinated changes under review.

## Canonical flow and ownership

Settings defines reusable programs, resource units, prices, agents, contracts, hotels, vehicles and users. Booking snapshots the sold program, guest counts, journey dates, commercial terms and exceptions. Guide allocates confirmed Booking transport components to boats; Head Driver allocates them to vehicles. Assistant Guide prepares physical items from each boat's allocated groups. Inventory transactions maintain the independent stock ledger; they are not another Booking entry screen.

Booking should be a top-level menu. Operations contains Driver, Boat and Stock submenus. Stock contains Supplies and Loans & returns. Stock balances and Stock movements belong under Inventory. Program components, services, equipment, consumables and warehouse definitions remain Settings. Trips/service slots remain compatibility and scheduling data, rather than the compulsory first step for a new Booking.

## Existing foundations and corrections

| Area | Foundation found in source | Correction in this work |
| --- | --- | --- |
| Booking identity | User-entered code; shared Trip required | Server allocates `BK-year-sequence` under the shared write transaction; requests are idempotent; new Booking owns a dated compatibility Trip |
| Journey dates | Trip start/end interval reused for each guest group | Independent outboundDate/returnDate and OUR/PENDING/OTHER/NONE; program FIXED, OPEN_RETURN, OUTBOUND_ONLY or RETURN_ONLY |
| Guest intake | Agent, group name, adult/child counts, hotel/room, notes and free-text allergies | Program-driven intake, hotel/channel references, explicit allergy status and selectable special requirements |
| Prices | Program direct prices and agent rate records existed but intake did not connect all choices | Program/agent rate selection; date-effective annual agreement reference; stored commercial snapshot; missing negotiated rate stays unknown |
| Exceptions | Components existed but excluded included items had no controlled credit | Per-component selling credit, exact satang totals, explicit missing-credit rejection and protected computed quantities |
| Payment | Per-booking terms existed | Agent allowed/default terms; Booking chooses among applicable terms; COUNTER daily sheet uses adjusted total |
| Dispatch | Confirmed component assignments, split adult/child counts, fleet capacity and crew existed | Pending query uses exact Booking leg date; unknown/other-company return excluded; independent remaining counts; vehicle return needs no promised pickup time |
| Concurrency | Operations and Settings share PostgreSQL advisory write lock | Retained lock before validation and mutation; unit checks cover ordering, capacity and duplicate request behavior |
| Preparation | Trip-level aggregation and manager-only stock mutations | Boat-run allocations drive exact physical item shares; authorized guide/assistant scopes; guest instructions and service preparation list |
| Stock issue | Stock lots, conditions, issues and settlements existed | Issue records carry runId; run/group share checks; outstanding stock prevents boat group removal/reduction |
| Documents | Shared original DB logo and daily family exist | Booking remains one daily document; output price comes from bookingQuote; optional logistics columns are separate from stored customer data |

## Settings inventory: how each dataset is consumed

| Settings dataset | Consumers / purpose | Fields that are descriptive or limited |
| --- | --- | --- |
| Company | Company identity and document branding are shared concerns; original PNG stored once as DocumentAsset | The current document logo is a fixed asset key; company profile edits do not imply a logo upload workflow |
| Business partners | Agent selection/contact snapshot, allowed/default payment terms; providers for services, boats/vehicles and partner tours | General payment notes, association and addresses are reference metadata, not billing automation |
| Tour programs | Direct adult/child rates; journey type/duration; program snapshot; component blueprint | Route, child policy, cancellation, departure notes and cutoff are descriptive snapshots; do not imply age validation, scheduling or cancellation-fee engines |
| Agent agreements | Agent, effective dates, signing date and evidence URL; linked annual rates | Signed document generation and a controlled upload/signature workflow await the owner's sample; storing an evidence link is not electronic signing |
| Agent prices | Agent+program agreed adult/child price; applicable agreement on service date; snapshot source/version | No negotiated rate means unknown price, not silent fallback to direct price |
| Hotels & pickup points | Booking hotel reference, hotel name and pickup instructions; driver logistics | Location coordinates/address support operational lookup; no automatic route optimization |
| Sales channels | Booking channel reference; AGENT channel requires an agent | Channel statistics do not imply a commission settlement ledger |
| Vehicles & boats | Active vehicle selection, passenger capacity, total capacity including crew, overlap conflicts, registration, assigned crew | Hire cost/commission metadata is not automatically posted to accounting |
| Services | Program meal/park/accommodation/boat/transfer lines; unit, provider, meal period, accommodation occupancy, charter/join mode | Unassigned meal/accommodation service slots do not block modern Booking confirmation; optional service scheduling remains separate |
| Program components | Required/included/optional/excluded choice; adult/child/person/booking/night quantity basis; day/usage point; removal credit | Credit uses the explicitly configured selling amount, never procurement cost; changing a catalog entry must not silently reprice a saved sale |
| Equipment | Fins, masks, towels, sizes/variants, units; program demand; loans and return condition | Per-person fitting or serialized asset identity is not modeled by an aggregate quantity alone |
| Consumables | Drinks/fruits, units, pack/case conversion; demand, issue and consumed/wasted settlement | Per-leg replenishment budget remains distinct from once-per-booking demand |
| Stock locations | Source/destination warehouses, boat/island stores; physical balance and issue/return | A store marked BOAT is not by itself a fleet assignment; preparation follows DispatchRun |
| Users and roles | Booking intake; Guide boat allocation; Head Driver vehicle allocation; assigned Assistant Guide stock preparation | User management scope remains separate from operational mutation permission |
| Trips / service slots | Legacy Booking compatibility, optional timed services and dispatch-run slots | New Booking does not require staff to duplicate date/program entry in a shared Trip first |

## Safety invariants checked in source and unit tests

- Draft/cancelled/excluded Booking components cannot be assigned to a run.
- Both adult and child allocations across runs are bounded; PERSON component quantity and run capacity also apply. A 12-seat vehicle rejects 14, and a 40-passenger boat rejects 45.
- OUTBOUND_ONLY, RETURN_ONLY, PENDING return and OTHER-company return are distinct. An explicit null leg never falls back to a compatibility Trip date.
- Guide/Head Guide can allocate boats; only Head Driver or company management can allocate vehicles. Assigned ordinary crew can read their jobs, not gain allocation rights.
- Driver projections omit dietary/payment data. Boat and stock preparation receive allergy status, dietary requirements and operational requests.
- Included removal quantities cannot be inflated to create excessive deductions. Unknown credit or negotiated price remains visible and cannot become a silently calculated zero.
- New Booking can confirm without choosing a physical stock warehouse or a meal service slot. Actual issue still validates stock availability, expiry, condition and allocated share.
- Boat issue allocation is counted once for the first boarding leg; outbound and return do not independently issue the same Booking's whole equipment quantity.
- Stock READY/CLEANING/DAMAGED and consumed/wasted settlements remain physical ledger events. Outstanding loan obligations cannot be hidden by removing/reducing the boat group allocation.

## Deliberate limits / follow-up items

1. Annual contract layout, signature capture and evidence file storage should be finalized from the owner's sample. Current agreement metadata supports dated price selection and an evidence link; no claim of a complete signing service.
2. Per-leg extra consumables, room-by-room distribution and cross-crew loan handover need explicit business rules. Current preparation uses exact aggregate shares and once-per-booking demand.
3. Existing legacy Trips remain to avoid breaking old records. Their independent service-slot and warehouse reservation behavior differs from new program-owned Booking; migration must not silently reinterpret historical sales.
4. Descriptive settings are retained deliberately. Departure times, cutoff notes, child policy, supplier commission and map coordinates are not unused data to delete merely because this work does not implement their respective automation engines.
5. Legacy feature folders containing README stubs are not proof of a functioning finance, customer CRM, employee scheduling or public booking module. This audit covers actual routes/modules in the Booking → Operations chain, not a claim that every future module is finished.

## Local evidence

Owned tests: `backend/test/booking-flow.test.js`, `backend/test/dispatch-safety.test.js`; existing regression: `backend/test/job-documents.test.js`. These cover deterministic journey/pricing, fake-transaction Booking save/confirm/idempotency, exact-leg dispatch eligibility, role restrictions, split allocation/capacity and outstanding-stock protection. ESLint was run on owned changed JavaScript. The shared advisory lock was inspected in operations/common.js and service-catalog/settings.js; mocks establish call ordering, not a real concurrent PostgreSQL execution.

Stock specialist additionally reports passing boat-stock-preparation and operation-access unit tests. UI smoke, integrated full-suite, migration and runtime verification must be recorded by the root integration owner after all agent changes are combined.


## Integrated verification on ESC / Preview

- `npm run check`: passed lint, 108 backend tests and both frontend builds. Existing bundle-size warnings remain informational.
- `node scripts/smoke-booking-flow-ui.js`: passed in Microsoft Edge; dated program, agent rate, removal credit, immutable included quantity, no code/slot/source entry, mobile, open return and failed-quote retry.
- `node scripts/smoke-allocation-stock-ui.js`: passed in Microsoft Edge; 12-seat/14-person block, split allocation, stale version recovery, scoped Stock issue, native date38px, 390px layout. Repeated after fixing clipped run selector and inherited table heights; selector fits and board height below900px.
- `node scripts/smoke-job-documents.js`: passed all three documents, repeat headers and long content. PDF text verification found correct Page current / total on every page: Booking10 rows one page, boat20 groups one page, long-note35-row case ten pages. Hotel/Room and Transfer removed only from reception sheet.
- `node backend/scripts/verify-booking-flow.js`: passed real Preview database transaction covering annual negotiated price, exact credit, server sequence/idempotency, PREPAID and child-only constraints, confirmation without logistics, pending return completion block, later return amendment and RLS. Entire fixture transaction rolled back; no test bookings or rates remain.
- Migration deployed to Preview. Initial unique-index replacement encountered an existing constraint-backed index; inspection confirmed the transaction rolled back completely. Corrected constraint replacement and extended legacy domain constraints, marked failed attempt rolled back, and deployed successfully. Both new private tables have RLS and no public/client table grants.
- Read-only current configuration: seven active programs; one has no unambiguous duration and needs company review; no active agent prices and no agreement records yet. These commercial values are intentionally not fabricated. Existing Booking prices/stock remained unchanged.
- Local API/public/backoffice restarted on ESC. No Production deployment. Original PNG database asset remains byte-identical.

## Current operating notes

Reception reports now list confirmed/completed arrivals on the selected Booking service day, plus return-only sales on their return date. Overnight guests are not repeated as new arrivals each day. Open-return Bookings remain confirmed until a return arrangement is resolved; PENDING cannot be completed. Changes to a return date require releasing return allocations first. Per-night package requirements require explicit review rather than silently modifying committed services.
