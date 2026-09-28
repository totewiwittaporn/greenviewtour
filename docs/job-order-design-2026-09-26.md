# Job Order: screen summary and print redesign — 26 September 2026

## Locked owner direction: screen summary

The operational quick-view modal and the full printable Job Order are different surfaces. Default quick view shows vessel/date, passenger counts by direction and program, and staff assigned to each direction. Additional information follows actual duties and server-side permissions. Full documents remain available separately for detailed review/printing. Do not add outbound and return passengers into a unique-customer total. This direction is recorded; the current modal has not been replaced by this design-only task.

## Current task boundary

Audit actual data and propose images for a compact, modern black-and-white print design. Do not change application components, database records, program codes, grants, deployment or persistent DEMO data. Image proposals are not proof of production pagination or print acceptance.

## Verified source and data

Sources: `frontend/backoffice/src/features/operations/JobSheets.jsx`, `dispatch.css`, `DocumentCore.jsx`; `packages/contracts/booking-plan.js`; `backend/prisma/schema.prisma`. Read-only Preview audit is saved privately in Downloads/Greenview-JobOrder-Design-2026-09-26/audit.json.

The selected Boat 1 outbound run has 3 Bookings (2 day trips and 1 overnight): 26 adults + 2 children = 28 passengers. Its return run has 2 Bookings: 18 adults. The audit examined 534 Booking records including 476 DEMO records. Maximum populated field lengths: group name 45, agent name 30, agent reference 20, program name 37, allergies 22, assistance 39, request notes 104 characters. No inspected record has populated structured specialRequirements; test those states with clearly labeled layout fixtures, not claims of live coverage.

The recurring DEMO disclaimer is 102 characters and is repeated in row notes. Move only this known dataset disclaimer to a document-level DEMO warning for the proposed view. Preserve actual customer instructions, source identity and exact booking/reference values. Header repetitions, verbose crew labels and duplicated full program summaries also consume space; existing print body text is already about 8.5pt, so shrinking all text is not the first solution.

## Owner program abbreviations and proposed presentation

Owner codes: Day Trip = DT; Day Trip Over Night = D/O; 2 Day 1 Night = 2D1N; Rent Trip = RT. Do not automatically map D/O to 2D1N or map boat tickets to RT. Existing Classic, Plus and Family programs must remain distinguishable; DT, DT-P and DT-F are proposed presentation aliases pending approval. No dedicated print-abbreviation field currently exists; preserve canonical program codes and names.

Proposed compact headings: #, BK / Ref, Agent, Group, Prg., A, C, Pax, Go–Ret, Notes, Act. A/C. Define abbreviations once, keep full identifiers, show unknown allergy status explicitly, and distinguish missing actual counts from zero. Vegan and vegetarian must have separate labels. Allergy warnings keep the actual allergen in readable text; optional note references link to complete instructions, not hidden or truncated safety information.

## Print-layout proposal for review, not yet implemented

Use A4 landscape, monochrome branding, restrained horizontal rules, concise section headings, right-aligned numeric columns and a separate bold per-direction total. Avoid repeating full Thai/English headers and full program names on every row. Preserve readable typography rather than automatically reducing font size to fit a page.

Prepare two visual scenarios: the verified 3-outbound/2-return Booking case, and a clearly synthetic capacity scenario containing 22 outbound Bookings with group sizes 2,3,2,4,2,3,5,2,3,4,2,3,2,4,3,2,5,3,2,4,3,2 (65 passengers). Heavy manifests may separate outbound and return pages; repeat vessel/date/direction/revision and column headers on continuation pages. Keep each Booking row intact where practical, preserve full long notes with an explicit reference, avoid orphan totals, and number pages current/total at bottom left. Never promise all 20+ Booking manifests will fit one page: length, number of legs and instructions determine pagination. Actual print/PDF pagination must be validated after the owner selects the design.

Only this design note and private audit/mockup outputs are written in this task. No application implementation, schema, source-program abbreviation or Preview data changes are authorized by the image proposal itself.

## Owner follow-up — accommodation, meals and Agent order

Owner approves the general monochrome direction for further design, not final print acceptance. Move Agent immediately after No. Keep Agent, guest/group identity and booking/reference together before program and passenger counts.

Add explicit compact accommodation and meal columns instead of burying them in remarks. Distinguish accommodation provided through Greenview from accommodation supplied/arranged by the customer, and distinguish tents from bungalows. Suggested presentation aliases, not persisted business codes: T-CO = tent arranged by the company; T-OWN = customer's own tent; B-CO = bungalow arranged by the company; B-OWN = bungalow arranged by the customer. No accommodation and unknown/unconfirmed accommodation must remain different states. Company-arranged does not assert physical ownership of a national-park asset.

Meals should identify included breakfast/lunch/dinner (B/L/D), with a day number for overnight programs; SELF denotes explicitly self-catered/no included meals. Do not infer meals, accommodation, duration or return dates from a print abbreviation. Read saved selected components and explicit exclusions. Structured existing requirements include VEGAN, VEGETARIAN, OWN_TENT, OWN_BUNGALOW, NO_MEALS, NO_PARK_FEE, NO_TRANSFER and OTHER. Dietary preferences are distinct from allergy warnings. Allergy warnings retain readable allergen/detail; no code-only replacement of a safety instruction. Park-fee and transfer inclusion/exclusion may appear as compact explicit service flags with a legend.

Image revisions are labeled layout samples; illustrative accommodation/meal combinations do not prove they exist in the retained DEMO records. Preserve the real Greenview logo shape in monochrome rather than inventing another company logo. Correct sums per direction and never label outbound plus return as unique customers. Production document components and Preview business records remain unchanged during this design review.

## Owner revision: Route, crew and group columns

Remove Route from the header, overview and direction headings. Do not hardcode Khao Lak or infer a customer origin. Keep vessel, service date and outbound/return labels.

Split Captain team and Guide team, with each person's name shown for their assigned direction. The usual one Assistant Guide may become two or three when actually assigned. Do not print a fixed assistant count or create extra people in the operational roster.

Place one Agent / Group column directly after No.; Agent on the first line, Group on the second. Remove the Booking / Reference column from the proposed print view, not the underlying system. Preserve one row per booking group and the document number/date/vessel/revision. Agent grouping must not merge independent booking records. Duplicate group names need an unambiguous distinction.

This is a design-only revision. The screen summary and live print components are unchanged. Image samples must have correct per-direction totals, no combined unique-customer total, and the original boat-and-sun Greenview logo rather than an invented mountain logo.

## Approved implementation — aliases, compact print and English column headings

The owner's subsequent approval authorizes implementation of the printable layout, Agent short name and ellipsized Group display. This supersedes the design-only restriction above for these changes. The separate quick-view modal remains deferred; it has not been replaced in this task.

`BusinessPartner.shortName` and `TourProgram.printCode` are optional VARCHAR(10) fields exposed in the existing authorized settings forms. Agent aliases are read from the related Agent settings at document read time. Full Agent names remain the fallback. Unconfigured program aliases receive document-local P1/P2 identifiers with a full-name legend; no real Agent/program codes were guessed or seeded. Existing clients omitting an alias preserve it; an explicit empty string clears it. Settings search includes Agent aliases.

Backoffice Core DataTable column headings are now English in both locales, with localized tooltips. Standalone document table headings follow the same rule. Navigation, page headings, forms, controls, statuses, validation and authored values retain their prior locale behavior. Capacity tables pass English source headings rather than translated strings. Member/Public UI cores were not modified.

`CompactBoatSheet` replaces the old dense BoatDailySheet representation. It uses the existing logo in monochrome, removes Route and the printed Booking/reference column, keeps Agent/Group immediately after No., and names Captain/Guide team members with their actual legs. It preserves separate outbound/return totals and does not fabricate a unique-customer daily total. Group names alone are ellipsized using grapheme-aware display truncation and CSS; full names remain in the data and accessible title. Independent Booking rows are not merged.

Only selected operational service metadata is projected to boat documents. Saved snapshot metadata is preferred; legacy snapshots lacking meal/accommodation fields fall back to the referenced current resource metadata. New saved snapshots include these fields. No price/cost/commission payload is added to staff documents. Accommodation, meals and explicit exclusions are not inferred from program aliases. Vegan and vegetarian remain distinct. Allergy/assistance/operational notes are never truncated. Only the exact known repeated DEMO disclaimer is replaced with a document-level DEMO notice for the identified retained dataset.

Migration `20260926143000_job_order_aliases` adds two nullable columns on verified Preview `qplzgpyidszxbtbyknjc`. Prisma deploy failed with P1011 (root certificate not trusted); the exact reviewed SQL and matching SHA-256 migration ledger entry were applied atomically through the existing certificate-verifying pg pool. TLS was not disabled. No existing business values, permission grants or Production data were changed. Prisma Client was regenerated.

Live Preview verification saved/read/searched a ten-character alias, rejected eleven, preserved omission and cleared an explicit empty value inside a fully rolled-back fixture transaction. The actual Captain account loaded the live 3-outbound/2-return manifest, showing 28 outbound / 18 return passengers. Switching TH/EN did not change column labels. No real attendance, stock or payment command was submitted.

Rendered print verification: the actual five group rows now fit one A4 landscape page; a synthetic 22-group / 65-passenger outbound manifest with deliberately long group names occupies two pages with repeated direction/vessel/date/revision and column headings, continued row numbering and a final correct total. PDFs were rendered and inspected through macOS PDFKit. This is not a claim that every 22-group document fits the same page count or that a physical printer/Safari was tested. Private evidence is outside Git in Downloads/Greenview-JobOrder-Implementation-2026-09-26.

## Latest owner override — portrait, color and full-document modal

The owner now explicitly chooses the full document in the modal rather than the deferred summary-only view. Boat Job Orders use A4 portrait, the existing system color logo, readable black body text, restrained cyan/magenta accents and warm-yellow totals. This supersedes the earlier monochrome/landscape and summary-modal directions; unrelated vehicle and daily Booking print formats remain unchanged.

The modal fits each actual paper page to its available width and scrolls vertically. Core FitDocument scales the surface without changing document layout. Page measurements use the native 190 mm content width after fonts/images load, normalized independently of the display scale. The same paged markup is used for screen and print, with repeated identity, direction/revision and column headings on continuation pages and current/total page numbers at bottom left.

Twenty is a row ceiling, not a forced one-page quota. Measured height can cause an earlier break; 22 standard rows are balanced across 11/11 pages rather than 20/2. Final totals and the sign-off stay with content. Exceptionally long instructions are split into lossless, explicitly continued rows with repeated group identity and no duplicated passenger quantities. Unsafe/unmeasurable layout fails visibly and blocks the print command instead of clipping content.

Generic legends no longer consume paper space. Codes opens a nested, screen-only reference; the same bilingual definitions are in authenticated role manuals. Program abbreviations still come from settings. Missing or ambiguous codes now print the full program name, not unexplained P1/P2 identifiers. Actual allergy/assistance/customer instructions remain printed in full, distinct from the general reference. Group-name ellipsis affects display only.

Validation evidence is outside Git in Downloads/Greenview-JobOrder-Portrait-Color-2026-09-26. Fixture cases include five rows, 18/20/22 rows, 20 outbound plus 20 return, long remarks and a multi-page single instruction. PDFKit checks physical A4 portrait bounds, actual page count against the preview, repeated headings and footer numbering. Browser checks cover 1440/834/390/320 px, TH/EN, Codes focus/scroll ownership, printing readiness and closing the modal. The preserved standard document suite covers vehicle and daily Booking regressions.

The color treatment is an application design, not a printer calibration: exact CMYK ink quantities and equal cartridge usage are not controlled or measured. Physical printer output and Safari-specific printing remain untested. No schema migration, business record edit, staff grant, Production change, commit, push or deployment belongs to this revision.
