# UI contract

Business sources: `docs/architecture.md` and `docs/identity-access.md`.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Public application baseline | apps/public-web/src/core/ui/styles.css | DESIGN.md | Public web only | Public build and entry import |
| Backoffice application baseline | apps/backoffice/src/core/ui/styles.css | DESIGN.md | Backoffice only | Backoffice build and entry import |

Tables, forms, selection, dates, dialogs, toast and CRUD are not applicable to the empty entry points. Resolve their canonical owners inside the relevant core before implementing those capabilities. Do not add feature-local substitutes for reusable primitives.

## Future feature requirements

Use semantic controls, visible keyboard focus, accessible names, stable loading states and narrow-screen support. Equivalent workflows within an application must share labels, feedback and navigation behavior. Define locale and component state contracts with the first feature. UI visibility never substitutes for API authorization. Business rules remain in their source documents rather than being redefined here.
