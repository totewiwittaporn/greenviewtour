# Core consistency audit — 15 September 2026

Scope: static scan of all 56 backoffice JSX files, Core owners and feature usage; full backend/frontend automated suite; browser samples for the screenshot issues and native PDF. This is not an exhaustive live test of every business workflow, role or device.

Findings addressed:
- Catalog, company work and personnel finance used literal bullet triplets. The 20px text could wrap inside a narrow action button. All 17 feature action triggers now request Core Dropdown rowActions with the Core SVG more icon.
- Refresh presentation varied. Eleven feature consumers now use RefreshButton; the existing Button/Icon owners still implement it.
- Panel-first filterbars had zero top padding. Shared panel geometry now gives labels/buttons space from the border on desktop/mobile.
- Dispatch selected-run native button and invitation-link native textarea migrated to Core Button/TextAreaField with existing business classes and semantics retained.
- PDF wrapper removed from final entry flow: authenticated PDF links use inline disposition in a new tab; original filename, no-store, nosniff and fresh parent access remain. Other file types cannot opt into inline handling.

Static scan after migration: no direct button/select/textarea/dialog elements or browser alert/confirm/prompt calls in feature JSX. Native print tables, checkboxes, file fields and SVG signature drawing are intentional domain/native elements, not competing dialog/select/button implementations. DataTable remains the interactive dataset owner. Existing contract/permission guards remain unchanged.

Automated checks: npm run check (159 backend + 12 frontend), both builds; authenticated inline PDF header and revoked-permission regression tests added to existing HTTP coverage. Browser validation recorded below after login.

Known limits: actual iPhone/iPad hardware, all role combinations, complete financial lifecycle and LINE integrations were not audited live in this UI pass. Existing build chunk-size advisory remains.

Browser findings: Chrome Stock requests showed corrected filterbar top space, Refresh icon and horizontal action SVG; status listbox and action menu opened correctly. Initial native PDF response CSP default-src none blocked Chrome's built-in reader (ERR_BLOCKED_BY_CLIENT). Isolated synthetic-PDF header test confirmed script-src none; base-uri none permits the native reader while disabling document scripts. Native Chrome accessibility showed the original filename, page/zoom/print/download controls and the DEMO page text. Production inline headers updated accordingly; attachment policy unchanged.

Final authenticated browser verification:
- Chrome: opened Booking BK-2026-000012 supporting documents and clicked View document for the synthetic DEMO PDF. A new tab displayed Chrome's native PDF toolbar, page 1/1, zoom and the DEMO text, without the application wrapper. The original documents dialog remained open. The native title used the attachment identifier; the download response retains the filename.
- Safari: the authenticated inline PDF route displayed the DEMO page through the native PDF reader. The original workspace tab remained available. Stock requests screenshot confirmed filter label spacing, the Refresh icon and a horizontal three-dot action trigger.
- The uploaded one-page fixture is explicitly marked DEMO ONLY and is not a real booking, invoice or receipt.
- Final strict UI audit returned zero findings; lint passed after the RefreshButton handler declaration adjustment. The temporary isolated PDF header-test server was stopped; the local application remains running.
