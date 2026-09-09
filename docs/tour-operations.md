# Tour components, bookings and inventory

Authority: Greenview owner approvals on 2026-09-09. This extends the existing local Backoffice with the verified Preview database only. Public publishing, payment collection and supplier messaging are outside this change.

## Ownership and access

OperationResource is a common identity for SERVICE, EQUIPMENT and CONSUMABLE. Catalog retains service/provider/price and material-unit identity. Operations owns dated service slots, trips, program components and booking snapshots. Assets owns stock lots, location/condition balances, issues and the immutable movement ledger. The first release uses existing COMPANY Manager / Admin Manager server authorization on every operation; no department role is broadened. Tables remain in app_private with RLS and browser grants revoked. Existing private runtime role configuration is retained.

The API lives under /api/operations. UI uses the existing Backoffice Core and one table per tab: Services, Program components, Service availability; Equipment, Consumables, Stock locations, Stock, Issues & returns, Movements; Bookings and Trips. Tour programs remain in Settings. Trip Actions exposes a paginated preparation summary aggregated from confirmed and completed bookings, separated by resource and usage point.

## Catalog and program construction

Services include transfers, tour boats, optional longtail boats, meals and accommodation. Service prices/costs are separate nullable decimal values; price units are explicit (person, vehicle, boat, trip, person-meal, room-night, person-night). A time slot has capacity in that service unit, and optionally references an existing fleet vehicle. Overlapping active assignments of one vehicle are rejected. Capacity and asset readiness are checked again during booking confirmation. No vehicle, hotel supplier, departure time or price is invented.

Equipment covers masks (pieces), fins (pairs, separate size variants), towels (pieces) and other items. Consumables cover bottled water, soft drinks, juice, watermelon and pineapple. Bottled products specify actual bottles per pack and bottles per case independently, not a shared global ratio. Fruit uses whole fruits. Each stock command preserves entered unit, entered quantity, conversion factor and base quantity. Changing the pack configuration never rewrites previous documents. Base unit/category/size cannot change once referenced; create a separate item for a changed identity.

Program components reference existing TourProgram and resources: INCLUDED (default selected, removable), REQUIRED (included and mandatory minimum), OPTIONAL (not initially selected, separately priced), EXCLUDED (not selectable). Quantities use per booking, per passenger or per passenger per night, with a multiplier and itinerary day. Usage points distinguish boat, island, transfer and other. A meal count can use the multiplier; room-night quantities can be entered per booking. Itinerary notes are separate per component. Existing Route / itinerary text is preserved; no bulk interpretation/deletion occurs.

## Booking and availability

Trips specify door-to-door start/end in Bangkok time, passenger capacity and an optional tour program. No program means a standalone service job. Dates use the shared strict YYYY-MM-DD HH:mm parser. Day trip versus overnight is derived from trip dates. The user loads program defaults, selects extras and checks quantities, selects service slots and source stores, and saves a DRAFT. Drafts may omit assignments or prices, but CONFIRM requires them and checks all selected services/items atomically. For standalone service jobs the total consists of selected service/item prices, with no separate tour base charge.

Booking snapshot prices/conditions/identities survive subsequent catalog changes. Editing a saved draft's guest name preserves existing component quotes. Base adult/child prices remain explicit editable draft fields. New standalone additions use current catalog prices. Only drafts are editable. Required entries cannot be removed or reduced below their passenger/night basis; excluded entries cannot be selected. Confirmation fixes the booking, then holds passenger seats, service slot units, consumables and equipment. Cancellation releases reservations only before any stock issue. A booking with issued goods must be settled and completed, retaining the inventory trail.

Consumables cannot be reused by later bookings: outstanding reservations allocate ready lots against expiry deadlines, with the latest deadline served first. Equipment can be reserved across disjoint half-open intervals. Outstanding booked equipment can be projected as returning after an earlier trip for later planning, but an actual issue always requires physical READY stock. Missing or unclean returns therefore block dispatch, even if a later booking exists. The operator must allow actual cleaning/turnaround time when choosing trip intervals. Unscheduled issues carry no assumed future return date.

Shared transactional locking serializes catalog, identity, booking and stock changes. Negative balances, excessive returns and over-capacity confirmation are rejected. Stock updates require the balance version. Commands retain idempotency IDs and request hashes; a repeated successful receipt or settlement cannot double-write. Editing the payload of an already successful ID returns a conflict. Audits and writes share the transaction.

## Stock and custody

RECEIVE creates a dated lot in a real location, recording selected purchase unit and optional cost per purchase unit. No opening balances are seeded. TRANSFER relocates stock without calling it consumption. ISSUE removes ready stock and creates custody with destination and responsible person, optionally linked to a confirmed booking resource line. Linked issues cannot exceed the outstanding preparation quantity.

SETTLE records consumed, wasted/lost, returned intact/ready, returned for cleaning/inspection, or damaged. Equipment cannot be consumed; consumables do not enter cleaning. Return quantities cannot exceed outstanding custody. Whole-fruit returns must be intact; cut leftovers are noted as consumption/waste, never reintroduced as whole fruit. CLEANING and DAMAGED balances are excluded from ready supply. CONDITION records cleaning/inspection or repair with a reason. COUNT records actual base-unit count and reason against a version, preserving old/new quantities in the movement history; reserved stock cannot be silently reduced below commitments. Expired lots cannot be issued or marked ready.

Completion requires all selected material quantities issued and every associated issue settled. The movement ledger is read-only in the UI. There is no hard-delete endpoint. Users see paged lists and all-record summary counts independent of filters.

## Starter catalog

The explicit seed script creates only owner-named starter services, equipment and consumables as INACTIVE. No rates, packaging ratios, supplier assignments, capacity or stock balances are guessed. Review variants, actual pricing units and packaging before activation. Existing programs, fleet, partners and user data are untouched. The script is idempotent by code and does not overwrite edited records.

## Verification

- backend/test/operations-contract.test.js: exact units, strict dates, nights and interval peak.
- backend/scripts/smoke-operations.js: real verified Preview database, uniquely prefixed fixtures, authorization, pack receipts and retries, transfer, concurrent issue, reservation/capacity blocks, sequential equipment reuse, cleaning/returns, consumption, price snapshots, preparation aggregation and browser-role table protection. Cleanup affects only this run's IDs/prefix.
- scripts/smoke-operations-ui.js: isolated browser fixtures and rendered forms, dialogs, tabs, narrow viewport and action icons.

BusinessPartner classification additionally supports SERVICE_PROVIDER for meals, accommodation and other service vendors. This changes business classifications only, not employee security roles. Existing partner classifications remain valid.
