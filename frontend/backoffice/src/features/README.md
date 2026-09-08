# Backoffice features

Organize by menu and page: `<menu>/<page>`. The 12-menu, 34-page plan is documented in `docs/backoffice-menu-map.md` and its JSON inventory at repository root. These folders are placeholders only, not active navigation or screens.

Each page owns its page-specific components, modals, hooks and API adapters. Menu-local reuse belongs in `<menu>/shared`. General presentation/behavior belongs in Backoffice `core/ui`; application routing/providers belong in `app`. Backend counterparts use the same relative menu/page path under `backend/src/backoffice`.
