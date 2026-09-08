# Backoffice API adapters

Mirror the Backoffice menu/page folders using `<menu>/<page>`. The exact map is in `docs/backoffice-menu-map.md` at repository root. These are reserved transport/composition boundaries, not working endpoints.

Page handlers delegate to `../modules` for business behavior and scoped authorization. Shared page support belongs in `<menu>/shared`; reusable domain services remain in modules. Never duplicate database models or bypass domain services. `../app` will compose routing when the API runtime is implemented. Dashboard and Reports are consumers of existing business modules, not new transaction owners.
