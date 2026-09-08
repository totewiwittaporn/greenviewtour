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

Show real Preview data, including zero accounts. Label the workspace read-only. Keep loading, error and empty distinct. Do not display an authenticated staff identity when local development has no staff session. Auth/RBAC and write actions remain a later implementation; this local owner tool must not be deployed as an authenticated admin system.
