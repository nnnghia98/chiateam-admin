---
version: alpha
name: Chiateam Admin
description: "Airbnb-inspired sports admin dashboard with light/dark themes and strong data readability."
colors:
  primary: "#ff385c"
  primary-hover: "#e00b41"
  primary-strong: "#b00033"
  text-primary-light: "#222222"
  text-secondary-light: "#6a6a6a"
  text-primary-dark: "#f5f5f5"
  text-secondary-dark: "#a3a3a3"
  background-page-light: "#f5f5f5"
  background-page-dark: "#111111"
  surface-card-light: "#ffffff"
  surface-card-dark: "#1c1c1e"
  surface-muted-light: "#f2f2f2"
  surface-muted-dark: "#2a2a2a"
  border-light: "#c1c1c1"
  border-dark: "#2e2e2e"
  state-active-light: "#fff0f2"
  state-active-dark: "#3a1020"
  error: "#c13515"
  legal: "#428bff"
  white: "#ffffff"
  black: "#000000"
typography:
  heading-xl:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-md:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.3
  body-md:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
  label-md:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.25
  label-sm:
    fontFamily: "Inter, Circular, -apple-system, system-ui, Roboto, Helvetica Neue, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.33
spacing:
  px: 1px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  section-gap: 24px
  page-padding-mobile: 16px
  page-padding-desktop: 32px
rounded:
  sm: 4px
  md: 6px
  airbnb: 8px
  badge: 14px
  card: 20px
  large: 32px
  full: 9999px
shadows:
  card: "rgba(0,0,0,0.02) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 6px, rgba(0,0,0,0.1) 0px 4px 8px"
  hover: "rgba(0,0,0,0.08) 0px 4px 12px"
  sidebar-mobile: "rgba(0,0,0,0.04) 0px 2px 8px"
  focus-ring: "rgb(255,255,255) 0px 0px 0px 4px, rgba(0,0,0,0.2) 0px 0px 0px 6px"
elevation:
  level-0: "flat background layer"
  level-1: "card shadow for content surfaces"
  level-2: "hover shadow for interactive lift"
  level-3: "focus ring and active emphasis"
motion:
  duration-fast: 150ms
  duration-base: 200ms
  duration-layout: 300ms
  easing-standard: "ease"
  easing-emphasis: "ease-in-out"
  scale-active: 0.95
  shimmer-duration: 1.4s
components:
  button-primary:
    backgroundColor: "{colors.text-primary-light}"
    textColor: "{colors.white}"
    typography: "{typography.label-md}"
    rounded: "{rounded.airbnb}"
    height: 40px
    padding: 24px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-destructive:
    backgroundColor: "{colors.error}"
    textColor: "{colors.white}"
    rounded: "{rounded.airbnb}"
  button-outline:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.airbnb}"
    height: 40px
    padding: 16px
  button-secondary:
    backgroundColor: "{colors.surface-muted-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.airbnb}"
  button-secondary-dark:
    backgroundColor: "{colors.surface-muted-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.airbnb}"
  card-default:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.card}"
    padding: 24px
  card-dark:
    backgroundColor: "{colors.surface-card-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.card}"
  page-shell-light:
    backgroundColor: "{colors.background-page-light}"
    textColor: "{colors.text-primary-light}"
  page-shell-dark:
    backgroundColor: "{colors.background-page-dark}"
    textColor: "{colors.text-primary-dark}"
  table-caption:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.text-secondary-light}"
    typography: "{typography.label-sm}"
  table-caption-dark:
    backgroundColor: "{colors.surface-card-dark}"
    textColor: "{colors.text-secondary-dark}"
    typography: "{typography.label-sm}"
  table-divider:
    backgroundColor: "{colors.border-light}"
    height: 1px
  table-divider-dark:
    backgroundColor: "{colors.border-dark}"
    height: 1px
  input-default:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.airbnb}"
    height: 40px
    padding: 12px
  input-focus:
    backgroundColor: "{colors.surface-card-light}"
    textColor: "{colors.text-primary-light}"
  nav-link:
    backgroundColor: "{colors.background-page-light}"
    textColor: "{colors.text-secondary-light}"
    rounded: "{rounded.airbnb}"
  nav-link-dark:
    backgroundColor: "{colors.background-page-dark}"
    textColor: "{colors.text-secondary-dark}"
    rounded: "{rounded.airbnb}"
  nav-link-active:
    backgroundColor: "{colors.state-active-light}"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.airbnb}"
  nav-link-active-dark:
    backgroundColor: "{colors.state-active-dark}"
    textColor: "{colors.primary}"
  icon-chip:
    backgroundColor: "{colors.surface-muted-light}"
    rounded: "{rounded.full}"
    size: 32px
  legal-badge:
    backgroundColor: "{colors.legal}"
    textColor: "{colors.black}"
    rounded: "{rounded.badge}"
  overlay-scrim:
    backgroundColor: "{colors.black}"
---

## Overview
Chiateam Admin uses a clean, high-contrast dashboard style tuned for quick operational scanning. The visual identity is neutral-first with a single strong brand accent (`#ff385c`) reserved for key actions, status emphasis, and app identity moments.

The interface prioritizes clarity over ornament: soft card elevation, rounded shapes, and restrained motion. It keeps the same structural rhythm across light and dark themes so users can switch modes without relearning hierarchy.

The Airbnb influence should be interpreted as tactile warmth, disciplined red accents, rounded controls, and natural shadows. Do not carry over marketplace-specific patterns such as listing photography, host navigation, wishlist overlays, or premium travel tiers unless the admin product explicitly needs them.

## Colors
The system is anchored by warm neutrals and one saturated highlight color.

- **Primary brand accent (`#ff385c`)**: Used for active nav states, primary hover/action emphasis, and role/icon accents.
- **Accessible primary text (`#b00033`)**: Used when red text sits on the soft active tint.
- **Primary text**: `#222222` in light mode and `#f5f5f5` in dark mode.
- **Secondary text**: `#6a6a6a` in light mode and `#a3a3a3` in dark mode.
- **Page backgrounds**: `#f5f5f5` (light) and `#111111` (dark).
- **Surface backgrounds**: `#ffffff`/`#1c1c1e` for cards and major panels; `#f2f2f2`/`#2a2a2a` for muted interactive surfaces.
- **Borders**: `#c1c1c1` in light mode, `#2e2e2e` in dark mode.
- **Active nav background**: soft red tint `#fff0f2` with dark primary text in light mode, deeper tinted `#3a1020` with bright primary text in dark mode.
- **Disabled states**: use opacity-based treatment over the current text color instead of introducing another saturated color.
- **Info/legal links**: use `#428bff` sparingly for legal, informational, or external-link affordances.

Color usage should remain sparse and intentional: neutral surfaces for structure, brand red for importance.

## Typography
Typography is sans-serif and practical, with slight negative tracking on headings to preserve density without feeling cramped.

- **Family**: Inter/Circular/system sans stack.
- **Heading behavior**: Bold (`700`) for page and card-level hierarchy, semibold (`600`) for subsection emphasis.
- **Body behavior**: 14px and 16px body sizes with generous line height for quick tabular and dashboard reading.
- **Labels**: Medium weight (`500`) for controls, chips, and table headers.
- **Weight range**: 500-700 should carry most UI emphasis; avoid thin heading weights.
- **Tracking**: keep subtle negative tracking on headings only; do not apply tight tracking to dense table values.

Typography should support fast parsing in data-heavy contexts rather than expressive editorial tone.

## Layout
The layout model is responsive admin-shell plus content-canvas.

- **Desktop**: persistent left sidebar with collapsible width behavior.
- **Mobile**: sticky top bar with sheet-style navigation drawer.
- **Content container**: bounded width (`max 1600px`) with mobile-first paddings.
- **Spacing rhythm**: mostly 4/8/12/16/24/32 increments, with `24px` as the common section gap.
- **Data views**: cards and tables use compact internal spacing to maximize information density while preserving readability.
- **Responsive tables**: use desktop tables for comparison-heavy views, then switch to stacked mobile cards before columns become cramped.
- **Touch targets**: icon-only controls should remain easy to hit on mobile while preserving the compact admin feel.

## Elevation & Depth
Depth is created through soft layered shadows and color separation rather than dramatic blur or offset.

- **Base elevation**: tri-layer card shadow for panels and metric blocks.
- **Interactive elevation**: hover shadow for buttons/cards where lift matters.
- **Focus emphasis**: ring styles and subtle scale-down on press (`0.95`) for interaction feedback.
- **Backdrop behavior**: modal/sidebar overlays use translucent dark scrims to focus attention.

The card shadow is intentionally layered: the first layer behaves like a subtle border, the middle layer creates ambient lift, and the last layer gives the surface enough separation to scan quickly without feeling heavy.

## Shapes
Shape language is soft and approachable.

- **Standard control radius**: `8px`.
- **Badge/chip radius**: `14px`.
- **Card radius**: `20px`.
- **Large containers**: up to `32px`.
- **Circular controls**: full radius (`9999px`) for icon buttons and toggle affordances.

Do not mix sharp rectangular corners with this system unless intentionally introducing a separate visual layer.

## Components
Core components should follow these patterns.

- **Buttons**: primary buttons use near-black fill and white text, turning brand red on hover; destructive uses error red; outline and secondary variants stay neutral.
- **Cards**: white (light) and charcoal (dark) cards with consistent 20px corners and base shadow.
- **Inputs**: white fields, gray borders, dark text, and brand-colored focus ring treatment.
- **Navigation links**: active links use tinted red backgrounds plus accessible primary text; inactive links use secondary text with neutral hover fills.
- **Icon chips**: circular muted backgrounds framing small icons for metrics and affordances.
- **Loading states**: skeleton shimmer animation with neutral gradients in both themes.
- **Mobile cards**: table rows collapse into compact cards with the same surface, radius, and shadow rules.

## Do's and Don'ts
- Do reserve `#ff385c` for meaningful emphasis instead of broad decoration.
- Do use the darker primary red on pale red backgrounds to preserve WCAG AA contrast.
- Do preserve the neutral-first palette so data remains legible in both themes.
- Do keep corner radii rounded and consistent across related controls.
- Do use compact but regular spacing increments from the defined scale.
- Do use `#222222` instead of pure black for light-mode text.
- Don't introduce additional saturated accent families without a semantic reason.
- Don't import Airbnb marketplace patterns such as listing cards, wishlist buttons, or travel-tier colors into the admin UI.
- Don't use heavy, hard-edged shadows; keep depth soft and layered.
- Don't break light/dark parity by changing structural layout between themes.
