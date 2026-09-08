# Greenview Tour design ownership

## Context and intent

Two audiences: customers exploring/bookings services, and employees operating the company. This change establishes folder boundaries only; there are no product screens or approved visual designs yet.

## Ownership

Public-web presentation and behavior: `apps/public-web/src/core/ui`.
Backoffice presentation and behavior: `apps/backoffice/src/core/ui`.
Runtime baseline CSS: each core's `styles.css`. Public Vite template styling is retained as migration evidence, not an approved brand system. `legacy-template.css` is retained but not imported.

## Direction

The owner explicitly requires independent UI systems. No cross-application component, stylesheet or token imports. Each system centralizes repeated primitives within its own core. Define tokens, typography, responsive behavior and locale before the first product screen; visual identity is pending rather than guessed from Chalin Clothes.

## Current applicability

Both App components return null. There are no tables, forms, overlays, user actions or data flows to verify visually in this change. Future features must meet the UI contract and add applicable runtime/browser verification.
