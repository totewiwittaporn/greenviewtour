# Thai and English interfaces

The Backoffice, public website and Member applications expose TH / EN controls in their existing header or authentication layout. Each application owns its React locale provider and dictionaries; applications do not import another application's UI. No API, permission, scope, record transition or persisted business value changes are part of this interface localization.

## Thai interface terminology

Thai mode pairs English with Thai for navigation, headings, tabs, field labels and table headings (for example `ภาพรวมงาน / Dashboard`). English mode remains English. Long descriptions, validation and status feedback continue to use the selected language; English is not appended to every sentence. The selector visibly uses `TH` and `EN` with accessible full-language names. User-authored content and persisted codes remain unchanged. Semantic label helpers own this pairing rather than changing the general text translator.

## Preference and rendering

- `greenview.locale` stores `th` or `en`. Backoffice keeps its existing English default; public and Member keep their existing Thai default when no valid preference exists.
- Selection updates React context in place. It does not key/remount the application, submit a form, change routes, close dialogs or reload permission-bound dashboard data.
- Each provider updates the HTML `lang` attribute. Titles, labels, statuses, messages and display formatters respond to the preference. Core controls retain their original keyboard and focus behavior.
- The current tab remains usable if browser storage is blocked. A `greenview:locale` event synchronizes mounted consumers; browser storage events synchronize tabs on the same origin.
- Localhost ports and deployed subdomains are distinct origins. Their preferences are independent. A shared key alone cannot synchronize these origins; no authentication or user data is exposed to achieve cross-origin synchronization.
- Display dates use Gregorian business years in both languages. Date-only values do not shift days during formatting; timestamps use Thailand time where the workflow specifies it. ISO form/API values remain unchanged. Browser-native date picker chrome can follow the browser/operating system language.

## UI and data boundary

Backoffice translations cover authentication, workspace navigation, dashboard calendar/attention summaries, shared controls, bookings/operations, settings, company work and personnel/finance screens. Public translations cover home, navigation, catalog, promotions and system states. Member translations cover authentication/recovery, tour request forms and quote feedback, My trips, profile, payment proof, demo checkout and document controls.

Translate only known interface copy at its rendering boundary. Keep source messages or error codes in form state and translate when rendering so a later language change also changes existing feedback. Never translate routes, permission codes, enum values submitted to APIs, user names, record titles, notes or catalog content merely because they match a dictionary entry. Shared Dialog titles are raw; callers translate only known interface titles.

Backoffice locale ownership is `src/core/i18n` (runtime, provider and shared dictionary) plus `src/features/translations.js`. Public ownership is `src/core/locale.js`, `Locale.jsx` and `useLocale.js`. Member ownership is `src/core/locale.js`, `messages.js` and `LocaleProvider.jsx`.

## Content/model gaps

The audited Prisma models `TourProgram`, `TourPromotion` and `WebsitePopup` currently have one value for each customer-facing content field, rather than localized variants. Tour names/descriptions/itineraries/terms, promotion names/terms, pop-up titles/image descriptions/button copy and company payment instructions therefore remain the original authored content in both interfaces. Staff-entered content, immutable document snapshots and previously generated documents are also preserved. No guessed translations or destructive content migration are introduced.

Full bilingual editorial content requires an additive content model, Backoffice authoring fields, API locale/fallback contracts and approved translations of the actual published copy. This is a remaining content capability, not something the interface switch claims to provide. Server-generated/provider emails and existing exported files do not become bilingual from the browser preference alone.

## Verification

`npm run check` runs lint, backend tests, frontend tests for all three applications and all builds. `node scripts/smoke-browser-fixtures.js` runs the existing Backoffice regression scenarios and the three locale fixture scripts using isolated Vite servers and intercepted API data. The locale tests verify translation coverage, preserved unknown content, missing-price versus zero-price behavior, date/year consistency, persistence, error retranslation, draft and consent preservation, modal/focus behavior, no additional dashboard fetch on switching, and narrow-screen overflow.

These browser scenarios are fixtures, not real-account or live-database acceptance. The standard local launcher remains `npm run dev`; no hosted or Production deployment is needed for this change.
