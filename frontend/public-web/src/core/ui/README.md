# public-web UI Core

Canonical owner of this application’s tokens, typography, layout, components and reusable interaction behavior. Features import from this directory; never import UI from the other application.

`styles.css` owns the application baseline. Product tokens and interactive primitives are not implemented yet; add them here with their usage contract and appropriate verification when a feature needs them. Business rules belong in features/API modules.


Current reusable contracts:
- `ImageGallery`: selectable main image, horizontally scrollable thumbnails and full-screen preview. Core owns thumbnail selection, keyboard Previous/Next, touch swipe, focus restoration and preview layout; feature pages only provide ordered media records and labels.
