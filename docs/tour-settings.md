# Tour settings and agent prices

Authority: owner approval in the 2026-09-08 Greenview discussion. Greenview operates its own tours and resells partner tours. One partner may organize tours, refer customers and supply vehicles. Direct customer prices and each agent's prices for each program are independent.

## Delivered scope

Local Backoffice settings: company, business partners, tour programs, agent prices, hotels/pickup points, vehicles/boats, sales channels. All lists and foreign-record lookups are server-paginated (25). Existing company-manager authority (`managementScope.company`) governs reads and writes; department heads and ordinary employees gain no access. No public endpoint exposes costs, contacts or agent prices.

Program ownership is GREENVIEW or PARTNER, with an active TOUR_OPERATOR required for partner tours. Vehicles use the same ownership distinction and require an active TRANSPORT_PROVIDER. Partner roles are multi-select. Removing a role or deactivating a partner is blocked while an active dependent record uses it. A tour with active agent prices cannot be deactivated until those prices are inactive. Records are retained; no hard-delete API.

One price record per agent × program. Adult/child prices are independently nullable; at least one must be set. Null is unavailable/not configured, never zero or a fallback to direct/another agent's price. Zero explicitly means free. Money is decimal THB per passenger, maximum two decimal places. Supplier NET and per-passenger COMMISSION are distinct from direct and agent selling prices; the inactive supplier basis is cleared. No margin, tax or settlement calculation is inferred.

Sales channel belongs to a future booking, separate from passenger identity and operator. DIRECT includes walk-in, website, LINE, Facebook and phone; AGENT requires an agent when booking integration is built. This change stores channel definitions only, not customer classification.

REQUEST/INSTANT is planning metadata. This change does not implement seat allocations, booking confirmation, checkout, publication, or automatic supplier dispatch. Before enabling instant confirmation, booking integration must validate controlled availability. Future bookings must snapshot agreed prices and conditions; editing this master data must never rewrite historical bookings. Agent retail/resale prices, seasonal schedules, percentage commissions and settlement ledgers require their own booking/finance workflow.

## Integrity and operations

Private app_private tables with RLS and client grants revoked. Foreign keys restrict deletion; unique code and agent/tour constraints apply in PostgreSQL. Integer versions reject stale edits. Client-generated UUID prevents duplicate create on a repeated request; no automatic mutation retry. Writes and field-name-only audits are transactional. Shared identity advisory lock serializes writes against membership changes. Existing identity and invitations are unchanged.

Use the repository's existing Prisma migration history and verified Preview connection; no second migration system. Generate the client, validate, deploy the additive migration, then restart the local launcher. No hosted deployment or production changes. Company rows are singleton by a database unique expression index. No real partner, tour or price is invented or seeded.

## Owner refinement — structured address and single company

Province, district, subdistrict, house number, Moo and optional village are stored separately for CompanySettings, BusinessPartner, PickupLocation and UserProfile. Existing address text is retained as legacy input and displayed for reference; it is not automatically parsed or erased. Optional mapUrl accepts only HTTPS Google Maps hosts; coordinates are paired and bounded. No geocoding, location permission or paid Maps API is invoked. Saved pin links take precedence over coordinates, avoiding conflicting navigation destinations. Maps URL syntax follows https://developers.google.com/maps/documentation/urls/get-started.

Company already has a singleton database constraint. Its UI now opens the sole record directly or presents the same setup form when empty, without Add/list actions. Optimistic versions and singleton enforcement continue to reject competing initial setup or stale edits.

Internal navigation preserves the authenticated workspace and does not refetch /api/me on each menu click. Server authorization still runs for every protected API call. Shared typed-address fields and placeholders apply to employee/profile forms as well as settings. No new read permissions are granted for employee location data.

## Company page refinement — quick entry

Company access is Manager-only among ordinary roles. The existing ADMIN_MANAGER owner role retains full company access and is implicit in future permission discussions. Server authorization remains authoritative; suspended accounts and department heads cannot access Company. No grants or account records are changed.

Company address is displayed as a summary and edited in the shared Quick address dialog. Province → district → subdistrict dropdowns filter by parent codes; optional house number, Moo and village follow the selection. Clearing a parent clears its children. Apply changes updates the form draft; the page save commits the company record. All-empty addresses are allowed. Unrecognized existing names remain visible for deliberate replacement. New/changed company addresses validate their hierarchy on the server; unchanged legacy data is retained. The pinned MIT dataset and maintenance instructions are in packages/contracts/data/README.md.

Tax ID uses 13 digits with 1-4-5-2-1 grouping; Thai phone presentation supports mobile, Bangkok and other landline lengths, plus +66. Editing accepts pasted separators, formatting occurs on blur, storage normalizes separators only and preserves leading zeros/country codes. Other international numbers retain their supplied form for display. Both fields are optional. This validates syntax, not registration or ownership.

MapLocationField presents only a Google Maps share link. Removed coordinate inputs do not delete existing values. Company adopts the quick-address Core variant first; other address forms retain their current entry layout until their page review, while sharing the link-only Maps editor now.

## Address entry clarification

Owner clarification 2026-09-08: Keep the individual editable address fields on Company. Quick address is an optional helper, not a replacement summary. Save address applies the modal draft back to the named page fields; Save company details persists it. Postal code follows the subdistrict and is read-only, automatically derived from the complete province/district/subdistrict match for both manual and quick entry. Unknown/partial matches clear the derived code instead of retaining a stale one. Core and server use the same pinned postal dataset. Postal code is stored as an optional five-character field across the existing address models; no existing data is bulk-rewritten.

## English-first bilingual entry

Owner refinement 2026-09-08: Backoffice headings remain English. Address choices show English · Thai and search both languages, ignoring spaces/hyphens; Phang-Nga is the display/canonical English alias for province 82. Recognized new area selections store English names, while free-text names and house details retain the language entered. Existing Thai areas remain recognized without bulk migration. Shared GeographyFields now supplies dependent dropdowns on the page and in Quick address, including employee/partner/pickup consumers of AddressFields. No unrestricted area text is newly entered.

SearchableSelectField is the canonical searchable variant, built on pinned Base UI Combobox 1.8.0 (input-inside-popup pattern). It reuses Core dropdown/control tokens; ordinary small selects retain Radix Select. Search supports English/Thai, clear, no matches, keyboard/IME and dialog portal focus. Parent selection clears child fields. The existing postal-code derivation still matches Thai or English names and handles known Moo exceptions.

Core Company phone entry converts complete local Thai numbers to +66 on blur and the server repeats that normalization. Display uses +66-81-234-5678 (mobile), with landline groupings supported. Supplied international prefixes remain unchanged; no country is inferred for non-Thai-shaped numbers. Tax ID preserves its existing grouping and leading zeros.
