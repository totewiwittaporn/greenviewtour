# Company quick-address verification

2026-09-08. Owner-approved Company refinement, Preview/local only.

- npm run check: lint, 43 backend tests, Public and Backoffice production builds passed. The address dataset is a separate lazy chunk (~118 KB gzip); Vite reports its uncompressed size warning.
- Browser: isolated Edge fixtures passed Company singleton, contact formatting, parent-dependent dropdowns, optional house fields, draft apply/discard, invalid Maps URL, failed save retention, no repeated workspace authentication, back/forward draft protection and narrow layout.
- All seven settings smoke flows passed, including shared SelectField keyboard interaction and reduced motion. No fixture writes reached real databases or mail providers.
- Desktop Company and narrow open-dropdown screenshots inspected. Capture open dropdowns with viewport screenshots: full-page screenshots can resize the viewport and intentionally dismiss Radix popups, so those captures are not valid Escape-key evidence.
- Static premium UI audit: zero findings.
- No schema migration. Existing address strings and coordinates remain stored. The quick picker is adopted by Company first; link-only Maps is shared across current address forms.
