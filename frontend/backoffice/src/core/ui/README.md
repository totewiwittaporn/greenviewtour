# backoffice UI Core

Canonical owner of this application’s tokens, typography, layout, components and reusable interaction behavior. Features import from this directory; never import UI from the other application.

`styles.css` owns the application baseline. Product tokens and interactive primitives are not implemented yet; add them here with their usage contract and appropriate verification when a feature needs them. Business rules belong in features/API modules.


Current reusable contracts:
- `FormSection` / `FormGrid` / `FormEmpty`: compact long-form editor structure. Feature pages provide fields and business copy; Core owns spacing and typography.
- `MasterDetail`: structured collection selection/editing. Feature pages provide records and detail fields; Core owns two-column/stacked responsive behavior.
- `ModalView`: read-only detail modal. Feature pages provide authorized data only; Core owns modal geometry, typography, field/stat/list presentation. Do not add page-local footer Close/Edit actions; the Dialog header owns close behavior and list Actions owns Edit navigation.
