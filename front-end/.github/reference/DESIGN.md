---
name: Terracotta & Sage Dining
colors:
  surface: '#fbf8fb'
  surface-dim: '#dcd9dc'
  surface-bright: '#fbf8fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f5'
  surface-container: '#f0edef'
  surface-container-high: '#eae7ea'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#57423b'
  inverse-surface: '#303032'
  inverse-on-surface: '#f3f0f2'
  outline: '#8a726a'
  outline-variant: '#dec0b7'
  surface-tint: '#a23e18'
  primary: '#9f3c16'
  on-primary: '#ffffff'
  primary-container: '#bf542c'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb59c'
  secondary: '#4c6450'
  on-secondary: '#ffffff'
  secondary-container: '#ceead0'
  on-secondary-container: '#526a56'
  tertiary: '#815215'
  on-tertiary: '#ffffff'
  tertiary-container: '#9d6a2c'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcf'
  primary-fixed-dim: '#ffb59c'
  on-primary-fixed: '#390c00'
  on-primary-fixed-variant: '#822801'
  secondary-fixed: '#ceead0'
  secondary-fixed-dim: '#b2cdb5'
  on-secondary-fixed: '#092010'
  on-secondary-fixed-variant: '#344c39'
  tertiary-fixed: '#ffdcbb'
  tertiary-fixed-dim: '#faba75'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#673d00'
  background: '#fbf8fb'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
  price-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
  gutter-mobile: 1rem
  margin-mobile: 1rem
  bottom-nav-height: 4.5rem
---

## Brand & Style

This design system crafts an inviting, elevated casual dining interface optimized for browser-based mobile table service initiated via QR code. The aesthetic blends tactile warmth with modern culinary refinement: culinary richness, effortless hospitality, and rapid clarity under dim restaurant lighting. 

The visual style merges organic minimalism with tactile layers. Interfaces feel natural and culinary-driven—grounded by earthen ceramics, crisp editorial layout, and mouth-watering imagery. The user should experience zero friction, immediate trust, and sensory delight while navigating menu options, coordinating orders with companions at the table, and closing out the check.

## Colors

The palette draws directly from artisanal culinary elements—fired terracotta clay, herbal sage leaf, and charred cast iron.

- **Primary (`#C85A32` - Warm Terracotta):** Represents vitality, appetite, and primary interactive focus. Used for key conversion moments: "Add to Order", the floating order tally, and active checkout actions.
- **Secondary (`#5A735E` - Earthy Sage Green):** Evokes freshness, seasonal produce, and balance. Used for table session activity indicators, active diner badges, dietary callouts (vegan/organic), and confirmation states.
- **Tertiary (`#DDA15E` - Toasted Ochre):** Warm accent utilized for chef specials, pairing recommendations, and celebratory culinary callouts.
- **Neutral (`#202022` - Rich Charcoal):** Deep, soft black providing high legibility without the harshness of pure black.
- **Backgrounds:** Pure white is avoided to reduce screen glare in ambient dining environments. The foundation is a soft culinary linen cream (`#FBF8F4`), supported by elevated ceramic off-white containers (`#FFFFFF`) and warm stone dividers (`#ECE6DE`).

## Typography

Plus Jakarta Sans delivers geometric precision softened by friendly, open apertures. In a mobile QR context, typography must accommodate split-second scanning, reading across varied lighting conditions, and clear comprehension of pricing and dietary ingredients.

- Display and large headlines adopt tight negative letter-spacing for an editorial culinary presence.
- Body copy maintains relaxed line heights to ensure readability of descriptive dish narratives.
- Price styling uses bold weights with slightly reduced tracking, ensuring menu costs are prominent and unmistakable.
- Labels and micro-tags utilize medium to bold weights with slight positive tracking to preserve legibility when rendered inside small pill containers.

## Layout & Spacing

This design system targets mobile-first responsive viewports, primarily 360px through 430px wide mobile screens, expanding seamlessly to larger tablets used for table-side ordering docks.

- **Layout Model:** Single-column fluid stream bound to an outer container with a maximum width of 480px on desktop screens, centered with generous background margins.
- **Vertical Rhythm:** 4px baseline sub-grid with primary 8px spacing intervals (`space-xs`, `space-md`, `space-xl`).
- **Safe Areas & Viewport Edge:** Strict bottom padding reservation (`bottom-nav-height` + safe area inset) prevents the floating interactive order tally from obscuring card contents or scroll targets.
- **Horizontal Margins:** 16px screen edges provide maximum horizontal utility for wide dish cards while retaining touch targets clear of physical screen bezels.

## Elevation & Depth

Visual depth mirrors the tactile layering of ceramic dishware on a dining table:

- **Surface Level 0 (Base Canvas):** Soft cream (`#FBF8F4`), completely flat.
- **Surface Level 1 (Menu Cards & Modules):** Pure white (`#FFFFFF`) with a subtle terracotta-tinted ambient drop shadow: `0 2px 8px rgba(32, 32, 34, 0.04), 0 1px 2px rgba(200, 90, 50, 0.03)`. Edge definition is reinforced with a 1px border of `#ECE6DE`.
- **Surface Level 2 (Modals, Dish Config Sheets):** Pure white container with high-diffusion elevation: `0 8px 30px rgba(32, 32, 34, 0.12)`.
- **Surface Level 3 (Sticky Order Bar & Active Action Tally):** Elevated above all scroll layers with frosted backdrop blur (`backdrop-filter: blur(12px)`), semi-translucent charcoal or terracotta surface, and directional upward shadow: `0 -4px 20px rgba(32, 32, 34, 0.08)`.

## Shapes

The shape system leverages organic smoothness (`roundedness: 2`). Corners are friendly without slipping into bubbly playfulness:

- **Cards & Dish Containers:** `16px` (`rounded-lg`) corner radii create sleek, pocketed modules.
- **Interactive Buttons & Category Filters:** `9999px` (pill format) for intuitive affordance and quick thumb-swiping.
- **Dish Customization Tags:** `8px` (`rounded-md`) for structured selection chips.
- **Images:** Scaled to match container radiuses (`16px`), clipped with smooth inner contours.

## Components

### Buttons
- **Primary Action (CTA):** Filled Terracotta (`#C85A32`), white bold text, pill-shaped, 48px minimum height for thumb accessibility. Active state compresses scale to `0.98` with slight darkening.
- **Secondary Action:** Outlined Terracotta or Sage with 1.5px border, transparent background, and bold brand colored text.
- **Floating Incrementors (+/-):** Circular 32px buttons with charcoal iconography and soft cream background for rapid quantity adjustments.

### Chips & Tags
- **Dietary & Attribute Badges:** Sage green soft fill (`#5A735E15`) with deep sage text (`#3F5342`). Compact `label-sm` styling.
- **Customization Options (Single & Multi-Select):** Unselected chips carry an off-white background with `#ECE6DE` border. Selected chips shift to solid charcoal (`#202022`) or terracotta with contrasting crisp white typography.

### Table Session Indicator & Participant Avatars
- Positioned in the header banner. Displays the active table number (e.g., "Table 14") alongside overlapping 28px circular participant avatars with sage green active ring indicators (`#5A735E`) signifying who is actively viewing or adding items in real time.

### Menu Item Cards
- Horizontal card pattern featuring a 1:1 rounded photography thumbnail (88x88px) on the trailing side, with headline, description (line-clamp-2), price tag, and quick-add button aligned on the leading side.
- Tapping the card opens the bottom sheet dish customizer.

### Interactive Order Tally & Bottom Action Bar
- Sticky bar anchored to the bottom edge with an inset pill shape.
- Left zone displays item count badge and live total cost.
- Center displays participant status pulse (e.g., "3 items added by Sarah").
- Right zone contains the immediate checkout/review button in Terracotta.

### Form Inputs & Note Modifiers
- Text areas for kitchen notes have a cream tinted fill (`#F5EFEB`), zero border until focused, and transition to a 1.5px Terracotta outline on active state.