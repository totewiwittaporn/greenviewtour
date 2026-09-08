---
version: alpha
colors:
  primary: '#087f8c'
  ink: '#113d48'
  text: '#153840'
  muted: '#61787e'
  canvas: '#f5f9f9'
  surface: '#ffffff'
  border: '#dce8e9'
typography:
  heading:
    fontFamily: 'Manrope, sans-serif'
  body:
    fontFamily: 'Inter, Segoe UI, sans-serif'
  thai:
    fontFamily: 'Noto Sans Thai, sans-serif'
rounded:
  panel: '14px'
  control: '8px'
spacing:
  page: '42px'
  compact: '16px'
---
# Greenview Tour

## Overview

Reference: owner-provided https://greenviewtour.com/ inspected 2026-09-08. Preserve the real Greenview logo, island photography, sea-green/cyan family and travel typography. Public is a Thai travel homepage; Backoffice is an English company workspace. The public signature is a broad island photograph with Thai headline and restrained handwritten travel accent. Backoffice uses the same brand family with quiet, compact data panels. No borrowed template testimonials, invented staff, prices or review scores.

## Colors

The frontend applications own independent `src/core/ui/styles.css` files. Backoffice tokens implement the frontmatter values. Public tokens independently adapt the same brand (#087f8c), deep ink (#113d48), white and pale sea surfaces. Do not import UI or styles across applications. Runtime CSS is the token source for application-specific extensions. Theme is light only for this first preview.

## Typography

Manrope headings, Inter Backoffice body, Noto Sans Thai Public body, Montez for the Public hero accent only. Use system fallbacks when Google Fonts is unavailable. Backoffice body controls are 11–13px, heading 32px; public Thai hero uses 40–66px and normal text 12–15px. No all-caps Thai. Body text wraps naturally; account UUIDs use secondary text.

## Layout

Public: full-width hero, three tour cards, island story and contact section; mobile stacks sections. Backoffice: 244px desktop navigation, 76px header, 42px content padding; below 760px use an inline expandable navigation area and 16px content padding. The navigation is not a modal. Page scrolling remains natural. Only wide tables scroll horizontally.

## Elevation & Depth

Use borders and pale surfaces for admin hierarchy. Avoid heavy shadows and decorative charts. Hero shading is for text contrast, not a dashboard motif.

## Shapes

Backoffice panels 14px, controls 8px. Public cards 16px with one asymmetric island-story image radius. Icons use a consistent stroke, never emoji for admin actions.

## Components

Backoffice canonical owners: Shell, Button, SearchField, DataTable and Icon under its core/ui. Feature code owns data fetching and domain-specific empty/error copy. No screen-local substitutes for recurring controls. Global scrollbars are tokenized, focus rings visible, reduced motion respected. Planned navigation is visibly inactive. No nonfunctional create/edit controls.

## Do's and Don'ts

Show real Preview data, including zero accounts. Authenticated identity comes from the backend. Never infer roles from email verification or user metadata. The application remains a local development environment.

Authentication extends the existing sea palette: one island-photo panel anchors the team identity, while a quiet form panel owns the task. On narrow screens the photograph becomes a compact masthead. AuthLayout and FormField join the canonical UI owners; they reuse the existing runtime color, typography and focus tokens. No separate login theme or copied form-control implementations.

User Info and row Actions use the shared anchored Dropdown, with a compact white surface, quiet divider and sea-green focus. View, Edit and invitation forms use the shared 520px Dialog with a header X and natural scrolling. Keep account summary in a definition list, profile fields in FormField, and row Actions as a three-dot trigger. These additions reuse Backoffice runtime tokens; no account-specific color theme is introduced.

Modal text fields and SelectField triggers use a compact 36px height and 12px control type. Auth screens keep 44px fields. Menu/listbox rows are clear by default; pointer hover or keyboard navigation adds the sea-tint background without an item outline. SelectField wraps Radix Select and shares the Dropdown surface/option tokens, with a same-width popup inside the owning dialog layer.

## Employee profile and directory tabs

The personal Edit profile destination is `/profile`, a full page accessible to every active employee through User Info. Use a compact identity summary beside personal/contact and password sections; stack on narrow screens. Account identity, department, roles and status are read-only here. Optional fields: address, primary phone, emergency phone, Line ID. Do not add personal social networks. Save profile details independently of password changes. Preserve entries on errors and warn before leaving unsaved changes. Current password is required for self-service changes; success clears local sessions and asks the user to sign in again.

User management uses Users and Invitations tabs above the page heading. Each tab owns its complete dataset, controls and summary; only authorized inviters see Invitations. Keep directory search and pagination when switching tabs. The search wrapper owns a single aligned focus border and subtle ring. Phone links use `tel:` and are labeled separately for primary and emergency numbers.

Tab datasets use the same summary, toolbar, table viewport and footer rhythm. Inactive panels remain in one CSS grid area solely to reserve height; `inert`, visibility and aria-hidden remove interaction and accessibility exposure. Keep the page scrollbar gutter stable. A short opacity/vertical transition and sliding tab indicator are disabled for reduced motion. Tables scroll internally within a shared responsive viewport, preventing a long invitation list from resizing the entire page.

The root scrollbar gutter owns width reservation. Radix body scroll locks must not add a second right margin when stable gutters are supported. Verify with visible classic scrollbars, since headless defaults hide them. Invitation activation errors distinguish local throttling, provider throttling, email quotas, recipient configuration and password policy; 429 pauses manual resubmission while preserving entries. No automatic retries.
