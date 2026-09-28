# Member commerce validation — 15 September 2026

## Implemented locally / Preview
- Separate member application on 5175, public catalog on 5173, existing Backoffice on 5174.
- Published tour descriptions, itinerary, images, meals/fees, inclusions/exclusions, seasons and online travel/booking windows.
- Separate promotions with adult/child fares, dates, quota and configurable pending-review hold duration; original tour prices remain intact.
- Homepage highlights, public catalog and promotions use the same master data. Popup campaigns support image, optional mobile image, link, schedule, frequency and an authenticated draft image preview.
- Customer registration/login, exact account ownership, own trips, profile edits, request cancellation before acceptance, evidence upload/view and full-transfer payment review.
- Backoffice customer profiles and customer requests; acceptance creates the existing operational Booking with snapshotted selected services and agreed price. Evidence can be returned for correction before manual payment verification.
- Direct/Agent booking views and independent Booking guide assignments. Guide work conflicts with overlapping boat/vehicle rosters in both directions; no fictitious vehicle is required for partner-tour guide work.

## Automated checks
- `npm run check`: passed. Backend 181/181 tests, frontend 12/12 tests; lint and all three production builds passed.
- `backend/scripts/check-member-commerce.js`: passed against the Preview database with the full transaction rolled back. Covers request ownership/idempotency, confirmed operational Booking creation, independent guide assignment and overlap rejection, evidence ownership, corrected evidence, and full manual payment verification.
- Strict premium UI audits: Backoffice and member configurations both passed with zero findings. These are static checks, not browser certification.
- Read-only DB verification: CustomerProfile, CustomerRequest, TourSeason, TourPromotion, WebsitePopup, WebsiteImage and GuideAssignment all have RLS enabled and no anon/authenticated table privileges.
- Additive Prisma migrations applied to Preview using the verified TLS connection; Prisma client regenerated. No existing migration was changed after application.
- `git diff --check`: passed.
- Follow-up lint after customer form validation: zero errors; one existing React ref-cleanup warning in member LeaveGuard remains.

## Actual Chrome checks
Used Tee's existing Chrome tab, not a substitute browser.
- Published synthetic tour appears on the homepage and promotion page with independent normal/promotion prices, dates and remaining rights.
- Popup image renders; Escape dismisses it; it does not repeat after navigation within the same browser session.
- Promotion link carries tour and promotion selection into the member portal and its login return URL.
- Member tour detail shows both normal and promotional fares before login.
- Mobile viewport 390×844: login, registration and tour detail tested. Document width 379px within the 390px viewport; no horizontal overflow in these checked states.
- Forgot-password form and empty-email focus/error were also verified in Chrome without sending an email.
- Empty sign-in focuses the email field and marks both invalid fields; registration includes password confirmation. No real signup/email was submitted.
- Temporary viewport override reset. All synthetic public catalog/season/promotion/popup/component/resource fixtures were removed after the browser checks. No customer request or payment was created by the browser fixtures.
- macOS file-event behavior fixed for Public and Member using the same polling approach as Backoffice, so subsequent edits are reflected in local development.

## Pending runtime verification and configuration
- Staff login verified in Chrome and Safari. Customer lists load in both; a synthetic customer created in Chrome was visible after Safari refresh. Chrome empty customer-name validation now displays a field error and focuses the name input. The test customer `DEMO · ทดสอบสมาชิก Chrome/Safari` remains in Preview with no email or phone. Full signed-in member request/payment browser testing remains pending member login.
- The Mac is now unlocked. Further Safari interactions were interrupted by user navigation; comprehensive Safari acceptance testing remains pending.
- After owner approval, Supabase URL Configuration was reloaded and verified to contain three saved local redirects: `http://localhost:5174/login`, `http://localhost:5174/reset-password`, `http://localhost:5175/login`. Site URL remains `http://localhost:3000`. Production URLs will be added at deployment.
- Real signup/email delivery and confirmation remain unverified. Member recovery now uses a separate recovery session and the same member login redirect, strips tokens from the URL, coalesces the recovery exchange under React StrictMode, and clears both local identities after password changes. Its HTTP test passes; real recovery email and user-driven password entry remain unverified. Existing staff recovery is unchanged.
- Owner must enter receiving bank/account details and actual published tour/season/promotion terms. No bank details, refund policy or tax issuance rules were invented.
- No production domain/DNS/hosting deployment, payment gateway activation or real LINE sending.
- Existing Backoffice build has a large-chunk warning; the check succeeds. The pg adapter emits an existing concurrent-query deprecation during rollback integration tests; no failed assertion resulted.

This report does not claim the complete cross-browser acceptance test has passed.
