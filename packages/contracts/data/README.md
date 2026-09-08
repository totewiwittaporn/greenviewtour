# Thai administrative-area lookup

Source: https://github.com/thailand-geography-data/thailand-geography-json
Pinned commit: b8b3fb91c7df1129ff5b43cb46f7fcffadd2156b
Retrieved: 2026-09-08. MIT notice: LICENSE.thai-geography.

Derived from src/provinces.json, districts.json and subdistricts.json. Only administrative codes, parent codes and Thai/English names are retained, sorted by code. Snapshot: 77 provinces, 928 districts, 7,436 subdistricts. This is a community dataset, not a live government registry. Review upstream changes before replacing the snapshot; validate unique codes and parent references. No customer data is sent to this source at runtime.

The address picker matches existing Thai or English names within the selected parent, uses codes for dropdown identity and writes Thai names into existing address columns. Unknown existing text remains visible and is not silently replaced. The picker requires a complete hierarchy when applying a non-empty address; optional house fields may be empty. Existing records are not migrated or rewritten.
