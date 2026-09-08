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

## Tour settings

Company master-data pages extend the existing sea-green Backoffice, with the same page heading, bordered table, 36px dialog controls and three-dot actions. Search and status sit in a wrapping toolbar. Supplier and ownership fields appear only when relevant. All reference lookups use shared ReferenceField with an authored SelectField and explicit paged results. Natural document scrolling and the existing dialog scroll owner remain unchanged. Prices show THB and distinguish missing values from zero.

## Structured addresses and persistent navigation

Owner refinement 2026-09-08: Company is one full-page editing form, not a list of companies. Arrange its identity/contact fields in two columns and its address hierarchy in three columns, stacking on narrow screens. AddressFields owns province → district → subdistrict → house number → Moo → optional village, followed by a map-location section. Reuse the same fields in partner, pickup and employee forms. Muted placeholder examples are owned by Core fieldGuidance/FormField/TextAreaField; labels remain visible. Existing address strings remain available as Previous address, never guessed into administrative areas.

Core NavigationProvider keeps Shell and the authenticated profile mounted during internal page changes. Content routes change independently; unsaved link/back/forward transitions use the same app-owned discard decision. Normal external links and modified-click new tabs retain browser behavior. No font/color theme changes.

## Company quick-address refinement

Owner clarification 2026-09-08: Company uses the shared AddressFields quick variant: a compact address summary and Quick address button. AddressPicker opens the canonical Dialog, uses SelectField with dependent province/district/subdistrict options from a pinned, licensed local dataset, then enables optional house details. Changing a parent clears its child selections. Draft changes apply to the owning form only through Use this address; dirty dismissal requires a discard choice. Existing unrecognized text is retained until the user explicitly replaces it. New/changed company address hierarchies are checked server-side. Other forms can adopt this variant during their individual reviews.

MapLocationField is the shared link-only editor. Coordinate inputs are removed; existing coordinate values remain preserved in storage. FormattedField and contracts/contact.js own Company Tax ID and Phone presentation/normalization: format on blur, retain original digits and optional country prefix, allow empty values, validate on client and server. Admin Manager retains its existing full company-management access; other access is Manager only.

## Address entry clarification

Owner clarification 2026-09-08: Keep the individual editable address fields on Company. Quick address is an optional helper, not a replacement summary. Save address applies the modal draft back to the named page fields; Save company details persists it. Postal code follows the subdistrict and is read-only, automatically derived from the complete province/district/subdistrict match for both manual and quick entry. Unknown/partial matches clear the derived code instead of retaining a stale one. Core and server use the same pinned postal dataset. Postal code is stored as an optional five-character field across the existing address models; no existing data is bulk-rewritten.

## English-first bilingual entry

Owner refinement 2026-09-08: Backoffice headings remain English. Address choices show English · Thai and search both languages, ignoring spaces/hyphens; Phang-Nga is the display/canonical English alias for province 82. Recognized new area selections store English names, while free-text names and house details retain the language entered. Existing Thai areas remain recognized without bulk migration. Shared GeographyFields now supplies dependent dropdowns on the page and in Quick address, including employee/partner/pickup consumers of AddressFields. No unrestricted area text is newly entered.

SearchableSelectField is the canonical searchable variant, built on pinned Base UI Combobox 1.8.0 (input-inside-popup pattern). It reuses Core dropdown/control tokens; ordinary small selects retain Radix Select. Search supports English/Thai, clear, no matches, keyboard/IME and dialog portal focus. Parent selection clears child fields. The existing postal-code derivation still matches Thai or English names and handles known Moo exceptions.

Core Company phone entry converts complete local Thai numbers to +66 on blur and the server repeats that normalization. Display uses +66-81-234-5678 (mobile), with landline groupings supported. Supplied international prefixes remain unchanged; no country is inferred for non-Thai-shaped numbers. Tax ID preserves its existing grouping and leading zeros.

## Stacked modal scrolling

Owner refinement 2026-09-08: Core Dialog locks document scrolling until the final modal closes. Native top-layer modal semantics isolate background interaction; the Core stack enables only the frontmost dialog content scroller. Covered dialogs retain their scroll position and stable gutter. The header remains outside the content scroller. Dialog roots portal to body so nested dialogs remain independent. SearchableSelectField uses fixed positioning within its owning dialog portal, outside the scrolling body, with bounded option scrolling and no scroll chaining. Compact modal address sections and action groups use token-colored dividers with 12px spacing. Page form spacing remains owned by its existing layout.

Owner correction 2026-09-08: Section dividers also apply to page content. Shared address-section fieldsets separate Address and Map location with the Core border token and 12px margins. Company save actions use the same divider rhythm as modal actions. The address helper row uses compact spacing.

## Dataset Core and settings tabs

Owner approval 2026-09-08: Users is the visual reference for all dataset surfaces. DataTable owns semantic table markup, column headings, loading/error/empty states and an internally bounded scroll region. Pagination owns result ranges, page size, current/total pages and Previous/Next states. Unknown totals render a dash/status rather than zero. SummaryCards owns four cards: four columns on desktop, two columns at 1100px and below, including portrait tablet/mobile. Counts represent the complete authorized dataset before list filters. Keep Company a natural-height form with its existing dividers.

Core Tabs owns tablist keyboard semantics and the measured sliding indicator for any number of tabs. Core TabPanel owns active/inactive visibility, inert and aria-hidden semantics, content entrance animation and reduced-motion behavior. Users and all three settings groups must compose these same components; feature CSS only controls layout. TabPanel preserveLayout reserves inactive Users panel geometry; route-backed settings hide inactive panels. Arrow/Home/End explores labels; Enter/Space activates. Settings retain their existing deep-link routes and group into Company & Tours (Company, Tour programs), Partners & Sales (Business partners, Agent prices, Sales channels), and Transport & Pickup (Hotels & pickup points, Vehicles & boats). Each active dataset has one table. Internal tab navigation remembers filters/page in memory, respects unsaved-change guards and keeps the workspace mounted. Browser back/forward and direct links restore route parameters. Tables own bounded height; the surrounding tab and Company form never inherit a forced table height.

Tab motion correction: Tabs owns a measured sliding indicator for any tab label width or wrapped row. Users and all three settings groups share the 180ms content fade/5px slide; the indicator takes 200ms. Reduced motion disables both. Settings preserve native page/form height and existing dirty-navigation guards.
