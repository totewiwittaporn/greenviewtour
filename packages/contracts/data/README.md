# Thai administrative-area lookup

Source: https://github.com/thailand-geography-data/thailand-geography-json
Pinned commit: b8b3fb91c7df1129ff5b43cb46f7fcffadd2156b
Retrieved: 2026-09-08. MIT notice: LICENSE.thai-geography.

Derived from src/provinces.json, districts.json and subdistricts.json. Administrative codes, parent codes, Thai/English names and subdistrict postal codes are retained, sorted by code. Snapshot: 77 provinces, 928 districts, 7,436 subdistricts. This is a community dataset, not a live government registry. Review upstream changes before replacing the snapshot; validate unique codes and parent references. No customer data is sent to this source at runtime.

The address picker matches existing Thai or English names within the selected parent, uses codes for dropdown identity and writes Thai names into existing address columns. Unknown existing text remains visible and is not silently replaced. The picker requires a complete hierarchy when applying a non-empty address; optional house fields may be empty. Existing records are not migrated or rewritten.

Postal codes are derived only after matching all three administrative names. Unknown or ambiguous matches remain empty. This snapshot does not represent every special postal delivery exception; no province-only or district-only code is guessed.

## Reviewed delivery exceptions (2026-09-08)

The upstream snapshot uses 81000 for both Ao Nang (810116) and Nong Thale (810117). postalCodeFor corrects Nong Thale to 81180; Ao Nang requires Moo 1–6 → 81180 or Moo 7–8 → 81210. Without a recognized Moo it returns empty, never 81000.

Sources: local authority address at https://www.aonang.go.th/ (Moo 5, 81180); area delivery breakdown at https://wefastexpress.com/postal-codes-in-thailand/krabi/; destination first-party addresses at https://www.aonangbayresort.com/ (Moo 2, 81180), https://www.sofitelkrabiphokeethra.com/th/ (Nong Thale, 81180). These explicit reviewed exceptions do not establish that every national delivery exception is covered.
