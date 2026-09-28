# UI density and responsive verification — 15 September 2026

- User-owned Chrome tab, existing Manager session; desktop, 768×1024 and 390×844 viewport checks. Overrides reset afterward.
- Evidence table: desktop dialog 1040px, table client/scroll width 975/975px; tablet dialog 736px, table 671/671px. No unnecessary horizontal overflow.
- Phone: table text height 34.78px at 17.4px line height (two lines). Wide table scroll stays within dialog; full document details wrap without clipping.
- Filename preview `greenvie…`; original name retained in accessible download label and document details.
- Keyboard Enter opens ellipsis menu, selects document details and exposes complete long note; close returns focus to the action trigger.
- Users directory checked visually for compact rows, avatar/name/email and ellipsis controls. Booking table checked as another shared-component consumer.
- npm run check: 156 backend and 6 frontend tests pass, both production builds pass. Strict design audit has zero findings. Existing build chunk-size advisory remains.
- Manual authoring paused pending owner UI review. This is an internal validation record, not a user manual.
