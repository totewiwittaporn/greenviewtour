# Documents and signatures — 15 September 2026

Implemented: system-only company and Agent signatures with wide responsive SVG pads; immutable private audit snapshots and hashes; sequence/version/permission/idempotency protection. Booking evidence categories for Agent tickets and booking confirmations. Local photo preparation, preview and camera capture hint.

Checks: npm run check — 159 backend + 10 frontend tests pass; lint and both builds pass. Strict premium audit reports no findings. Signature server tests cover ordering, duplicate/replay, revocation, invalid strokes, document hash mismatch and void bills without changing payment state. Image tests cover unchanged PDFs, size/type rejection, bounded dimensions, decoder failures and PNG metadata stripping.

Real browser: Chrome showed company-first gating, wide signing dialog; keyboard drawing added a polyline and Clear removed it. 390×844 viewport retained the horizontal pad and reachable controls; viewport reset. Safari on Mac opened the same dialog; native pointer drag added a stroke and Clear removed it. No real person's signature was submitted. Automated review rejected an intentionally empty signature submit as potentially writing an invalid billing signature; the UI submission test was skipped, with invalid-input validation covered in backend tests instead. A real signing/submission acceptance check remains for the named signers.

Chrome file picker: original synthetic 550-byte PNG first expanded during re-encoding. Fixed by considering metadata-stripped original PNG compression when no resize/orientation/animation transform is required. Re-selected same file successfully; displayed size stayed 1 KB → 1 KB. Uploaded DEMO-COMPRESSION-150926 as Agent booking confirmation on BK-2026-000012; UI showed Document attached and the persisted row. This is clearly labeled synthetic test evidence, not an actual Agent document.

Actual phone camera capture and HEIC decode across devices remain unverified on hardware. Safari/Chrome desktop camera selectors use the native device file picker. No manual updates in this change.
