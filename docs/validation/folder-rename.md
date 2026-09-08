# Frontend/backend folder rename verification

- Base: bc4a6d61a37338da41b7da207dcd8157d95df2d4 (merged foundation).
- Moved public-web and backoffice to frontend/; moved API to backend/.
- Updated workspace patterns/lockfile, ESLint boundaries, UI ownership references and deployment paths.
- Clean npm ci installation, npm run check (lint + both frontend builds) and strict UI ownership audit passed.
- Inline ESLint checks rejected frontend imports of backend and another frontend application.
- Built JS/CSS filenames match the foundation outputs; no application behavior changed.
- No deployment or backend runtime implementation in this change.
