# Booking, Guide and Driver operations

Authority: Tee's September 9, 2026 workflow description and follow-up separating Booking from boat allocation. Company-owned tours are the current scope.

## Ownership

Booking and Head Booking own guest/agent details, selected program/services, payment terms and booking lifecycle. They do not allocate boats. Guide and Head Guide allocate boats and crews. Head Driver allocates vehicles, drivers and per-run pickup times. Assigned assistants, captains and drivers read their own job orders. Existing company managers retain operational oversight. These duties do not grant settings or user-directory management.

Settings contains reusable master records: company, partners, sales channels, tour programs and standard components, services, vehicles/boats, pickup locations, equipment, consumables and stock locations. Work menus above Settings contain bookings/trips, boat allocation, vehicle allocation and stock movements.

## Dispatch

Confirmed transport bookings may wait for allocation. A transport component explicitly requests outbound, return or both directions. Each dated run belongs to one actual vehicle, service, direction and time interval. Passenger capacity is distinct from price units such as a whole boat. Split allocations cannot exceed booked adults/children in the same direction. Actual counts are recorded separately; a reduced count requires a reason. Return allocation is independent of outbound allocation.

Boat service mode is join or charter. Vehicle master information distinguishes passenger capacity, total people including crew, expected crew, engine count and intended road uses. Unknown values remain unset. Vehicle schedules and staff schedules must not overlap; operations cannot silently edit master records.

Guest name, agent, program, room, pickup time, assistance and payment terms are shared from Booking with role-specific projection. Boat jobs do not expose payment terms, hotel rooms or agent phone details. Driver jobs expose pickup logistics and assistance, without pricing or dietary details. Job URLs require the existing authenticated account; a URL does not grant access. Printed copies contain the same role-specific data as the live view.

## Printed and mobile jobs

Guide and Driver views share one job-sheet representation for mobile and A4 landscape print. Every sheet identifies its run, direction, time, crew and revision. Booking's read-only document additionally shows payment terms and assigned boat/vehicle handoff. Printing a job includes its complete assignments, independently of the run-list page size.

## Daily reference and LINE readiness

Daily summaries capture versioned references at the operator's request. The optional runner targets 22:00 and 22:30 Asia/Bangkok on the evening before service. A closing snapshot is a saved reference, not a lock on booking entry. Corrections create a new reference revision. Allocated totals are not a certification that all bookings are assigned.

The Local workspace has no installed scheduler, LINE connection or externally reachable authenticated job-order deployment. Delivery remains disabled. The explicit runner and private outbox support configuration later; see operations-nightly-summary.md. The system must never show a prepared summary as delivered.

## Owner follow-up checklist

- Confirm park lodging types, available units, 2/3/4-person configurations, pricing and booking procedure. The starter tents/bungalows remain unverified and inactive.
- Confirm masks, towels, fins and lifejackets kept on each boat, ashore and on the island; who counts them and where cleaning/repair occurs.
- Confirm each vessel's engines, approved passenger/total capacity and required crew roles/counts.
- Confirm company longtail boats, morning/afternoon times, capacity and per-person/per-boat pricing.
- Confirm park breakfast/lunch/dinner prices, child policy, cutoff and special-meal arrangements.
- Confirm external vehicle hire and commission recipient, basis and settlement process. Configured defaults are not a payment or payable ledger.
- Confirm credit billing periods and responsibility for exceptional after-service payment. After-service entries require a reason and manager access in this implementation.
- Obtain existing A4 landscape boat/transfer documents before claiming exact legacy-layout parity.
- Configure the LINE account, intended group and an authenticated public job-order address before enabling delivery.

## Verification scope

Core navigation browser checks preserve document, Shell, Sidebar and account identity across work/settings links, history and unsaved changes. Dispatch browser fixtures verify assignment recovery and print/mobile surfaces; Preview database integration separately verifies real authorization, allocation, capacity, versioning and persistence. These are distinct checks; fixture browser tests do not claim real account end-to-end coverage.
