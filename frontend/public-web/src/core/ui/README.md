
# public-web UI Core

Canonical owner of this application’s tokens, typography, layout, components and reusable interaction behavior. Features import from this directory; never import UI from the other application.

`styles.css` owns the application baseline. Product tokens and interactive primitives are not implemented yet; add them here with their usage contract and appropriate verification when a feature needs them. Business rules belong in features/API modules.


Current reusable contracts:
- `ImageGallery`: selectable main image, horizontally scrollable thumbnails and full-screen preview. Core owns thumbnail selection, keyboard Previous/Next, touch swipe, focus restoration and preview layout; feature pages only provide ordered media records and labels.
- `CloseButton`: transparent X-only close action with a 44 px invisible hit target and shared focus/hover behavior. Public dialogs and image preview use this instead of a filled action button.
- `Pagination`: compact numbered pagination with previous/next chevrons, nearby pages, ellipsis and first/last-page access. Features provide only page, total and the page-change callback.
