# Design system: Precision Engineering Workspace

Copied from the Stitch project `13486008395924154472` design theme (`designMd`) on 2026-10-25.
Verbatim token values; the prose section is Stitch's style guidance. The app implements the
front-matter tokens as CSS custom properties (`frontend/src/styles/tokens.css`). Where the prose
contradicts the exported screens (for example zinc/slate neutrals vs. the exported surface
palette, or a left sidebar that no screen has), the exported screens win.

```yaml
name: Precision Engineering Workspace
colors:
  surface: '#fbf8ff'
  surface-dim: '#dad9e3'
  surface-bright: '#fbf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f2fd'
  surface-container: '#eeedf7'
  surface-container-high: '#e8e7f1'
  surface-container-highest: '#e3e1ec'
  on-surface: '#1a1b22'
  on-surface-variant: '#464555'
  inverse-surface: '#2f3038'
  inverse-on-surface: '#f1effa'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#004d70'
  on-tertiary: '#ffffff'
  tertiary-container: '#006693'
  on-tertiary-container: '#b8e0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#fbf8ff'
  on-background: '#1a1b22'
  surface-variant: '#e3e1ec'
typography:
  headline-lg: { fontFamily: Inter, fontSize: 1.75rem, fontWeight: '600', lineHeight: 2.25rem, letterSpacing: -0.02em }
  headline-md: { fontFamily: Inter, fontSize: 1.375rem, fontWeight: '600', lineHeight: 1.75rem, letterSpacing: -0.015em }
  headline-sm: { fontFamily: Inter, fontSize: 1.125rem, fontWeight: '600', lineHeight: 1.5rem, letterSpacing: -0.01em }
  body-lg:     { fontFamily: Inter, fontSize: 1rem, fontWeight: '400', lineHeight: 1.5rem }
  body-md:     { fontFamily: Inter, fontSize: 0.875rem, fontWeight: '400', lineHeight: 1.25rem }
  body-sm:     { fontFamily: Inter, fontSize: 0.75rem, fontWeight: '400', lineHeight: 1rem }
  label-lg:    { fontFamily: Inter, fontSize: 0.875rem, fontWeight: '500', lineHeight: 1.25rem }
  label-md:    { fontFamily: Inter, fontSize: 0.75rem, fontWeight: '500', lineHeight: 1rem }
  label-sm:    { fontFamily: Inter, fontSize: 0.6875rem, fontWeight: '600', lineHeight: 0.875rem }
  code-md:     { fontFamily: JetBrains Mono, fontSize: 0.8125rem, fontWeight: '500', lineHeight: 1.125rem }
  ticket-key:  { fontFamily: JetBrains Mono, fontSize: 0.6875rem, fontWeight: '600', lineHeight: 0.875rem, letterSpacing: 0.04em }
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
```

Note: the exported screens' Tailwind config uses `borderRadius: { DEFAULT: 0.25rem, lg: 0.5rem,
xl: 0.75rem, full: 9999px }`, i.e. cards in the Board View screen use 4px and cards in the Drawer
screen (`rounded-lg`) use 8px. The app standardises on 8px for cards, columns, drawer panels and
dialogs and 4px for badges/chips, which is what the design-system prose prescribes.

Theme metadata: color mode LIGHT, roundness ROUND_EIGHT, fonts Inter (headline, body) and
JetBrains Mono (labels/keys), override colours primary `#4f46e5`, secondary `#6366f1`,
tertiary `#0ea5e9`, neutral `#71717a`.

## Style guidance (Stitch prose, abridged to what the app uses)

- Quiet, content-first canvas; structure from hairline borders and light surface tiers rather than
  heavy shadows. Compact, information-dense layouts on an 8px/4px grid.
- Inter for all interface text; JetBrains Mono strictly for ticket keys, uppercase, muted.
- Kanban card: white surface, 8px radius, 12px padding; header row = ticket key + assignee;
  body = title (`body-md`, medium weight, 2-line clamp); footer = type and priority badges.
  Hover: slightly stronger shadow/border.
- Badges: 20px high, 4px radius, `label-sm`, icon + lowercase text. Type: bug = error-container,
  feature = secondary-container, task = surface-container-highest. Priority: low =
  surface-container, medium = tertiary-fixed, high = primary-fixed, critical = solid error.
- Drag: dragged card elevates (large shadow), tilts ~2 degrees, key turns primary; the target slot
  is a `primary-fixed/30` block labelled "Drop ticket here".
- Inputs: 32px high, `body-sm`/`body-md`, surface-container-low background, 1px primary ring on
  focus; invalid state = 1px error ring plus an inline `label-sm` error line with an icon.
- Primary button: primary background, on-primary text, `label-md`, 6–8px radius, 32px high.
  Ghost button: transparent, on-surface-variant text, surface-container on hover.
- Dialogs: centred, `surface-container-lowest`, 12px radius, backdrop `on-surface/40` with blur.
  Drawer: right side, 560px wide on desktop, full width below 640px, backdrop `on-surface/20`.
