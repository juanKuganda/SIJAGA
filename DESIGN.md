---
name: SIJAGA
description: "Sistem Jaminan Autentikasi Gelar Akademik — blockchain-verified academic credentials"
colors:
  crimson-deep: "#B91C1C"
  crimson: "#DC2626"
  crimson-bright: "#EF4444"
  crimson-glow: "#F87171"
  crimson-pale: "#FECACA"
  abyss: "#0A0A0F"
  vault: "#111118"
  surface: "#1A1A24"
  surface-elevated: "#1E1E2A"
  ink: "#FFFFFF"
  ink-secondary: "#A1A1AA"
  ink-tertiary: "#71717A"
  ink-muted: "#52525B"
  border: "#27272A"
  border-light: "#3F3F46"
  glass-fill: "rgba(17, 17, 24, 0.8)"
  glass-edge: "rgba(255, 255, 255, 0.06)"
  emerald: "#10B981"
  amber: "#F59E0B"
  sky: "#38BDF8"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.crimson-bright}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  card:
    backgroundColor: "{colors.vault}"
    rounded: "{rounded.lg}"
    padding: "24px"
  input:
    backgroundColor: "{colors.abyss}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
  badge:
    backgroundColor: "{colors.border}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.full}"
    padding: "2px 10px"
---

# Design System: SIJAGA

## 1. Overview

**Creative North Star: "Digital Vault"**

SIJAGA's interface is a secure chamber for academic credentials. Every surface communicates containment and protection: deep backgrounds that absorb light, glass panels that reveal depth without exposing internals, and a single crimson accent that signals attention the way a vault's status light does. The system is not decorative; it is architectural. Walls, floors, and ceilings of interface are differentiated by tone, not ornament.

The glassmorphism is deliberate, not decorative. Semi-transparent panels with backdrop blur create a sense of layered security, as if looking through reinforced glass at the data behind it. This is the one domain where blur earns its keep: it reinforces the vault metaphor rather than decorating it.

This system explicitly rejects: generic crypto/neon aesthetics, playful fintech patterns, legacy university portal design, and glassmorphism used for its own sake without spatial purpose.

**Key Characteristics:**
- Tonal depth hierarchy from abyss (#0A0A0F) through vault (#111118) to surface (#1A1A24)
- Single crimson accent used sparingly for primary actions, status indicators, and emphasis
- Glass panels for elevated containers that need spatial context
- Dense information layout appropriate to a tool, not a marketing page
- Consistent component vocabulary across admin, student, and public surfaces

## 2. Colors: The Vault Palette

A near-monochrome dark system punctuated by a single, deliberate crimson accent. The palette is 90% neutral, 10% signal.

### Primary
- **Crimson** (#DC2626): The system's sole accent. Used for primary buttons, active navigation states, focus rings, and status indicators. Its rarity is the point. If more than 10% of any screen is crimson, something is wrong.
- **Crimson Deep** (#B91C1C): Hover state for primary buttons. Slightly darker, maintaining the same saturation.
- **Crimson Bright** (#EF4444): Hover state accent. Lighter variant for interactive feedback.
- **Crimson Glow** (#F87171): Used in gradient text (brand name only) and subtle glow effects.

### Neutral: Backgrounds
- **Abyss** (#0A0A0F): The deepest layer. Page background, input fields, table headers. This is the void everything sits on.
- **Vault** (#111118): Card and container backgrounds. One step above abyss; the primary surface for content.
- **Surface** (#1A1A24): Tertiary backgrounds, secondary containers, hover states on neutral elements.
- **Surface Elevated** (#1E1E2A): The highest tonal layer. Used for dropdowns, popovers, and elements that float above the glass.

### Neutral: Text
- **Ink** (#FFFFFF): Primary text. Headings, data values, active labels. Maximum contrast against abyss.
- **Ink Secondary** (#A1A1AA): Body text, descriptions, secondary information. The workhorse text color.
- **Ink Tertiary** (#71717A): Labels, timestamps, metadata. Information that's present but not emphasized.
- **Ink Muted** (#52525B): Placeholder text, disabled states, the quietest text layer.

### Neutral: Structure
- **Border** (#27272A): Primary dividers, card borders, table rules. Visible but not prominent.
- **Border Light** (#3F3F46): Hover states on borders, secondary dividers. Subtle lift on interaction.
- **Glass Fill** (rgba(17, 17, 24, 0.8)): Background for glass panels. 80% opacity with backdrop blur.
- **Glass Edge** (rgba(255, 255, 255, 0.06)): Border for glass panels. Barely visible, just enough to define the edge.

### Semantic
- **Emerald** (#10B981): Success states. Verified wallets, minted degrees, confirmed actions.
- **Amber** (#F59E0B): Warning states. Pending wallets, items needing attention.
- **Sky** (#38BDF8): Information states. Neutral badges, system info, blockchain network indicators.
- **Crimson** (also used for): Error states, danger actions, revoked credentials.

### Named Rules

**The 10% Rule.** The crimson accent is used on ≤10% of any given screen. Its rarity is the point. Primary buttons, active states, and critical status indicators only. If everything is accent, nothing is.

**The Tonal Hierarchy Rule.** Background depth follows: abyss → vault → surface → surface-elevated. Never skip a layer. A card on abyss uses vault; a dropdown on a card uses surface-elevated.

## 3. Typography

**Display Font:** Space Grotesk (with system-ui fallback)
**Body Font:** Space Grotesk (with system-ui fallback)
**Mono Font:** Space Grotesk (monospace features, or system monospace for code)

**Character:** A single geometric sans-serif carrying the entire interface. Space Grotesk is precise and technical without being cold. Its geometric construction reinforces the vault's architectural quality. No font pairing needed; weight contrast (300–700) provides all the hierarchy this system requires.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3.75rem), line-height 1.1, letter-spacing -0.02em): Hero headlines on the landing page only. Max 6rem cap. Use `text-wrap: balance` for even line breaks.
- **Headline** (600, 1.875rem, line-height 1.2): Section headings, page titles in admin/student views.
- **Title** (600, 1.25rem, line-height 1.3): Card titles, subsection headings, dialog titles.
- **Body** (400, 0.875rem, line-height 1.6): All body text, descriptions, data labels. Max line length 65–75ch for prose.
- **Label** (500, 0.75rem, line-height 1.4, letter-spacing 0.05em): Table headers, form labels, badges, metadata. Uppercase allowed for ≤4 word labels only.

### Named Rules

**The One Family Rule.** Space Grotesk is the only typeface. Do not introduce a second font for "variety." Weight contrast (300 light for quiet text, 700 bold for headlines) provides sufficient hierarchy. More than one family on a dark, dense UI reads as indecision.

**The Density Rule.** Product UI is dense by nature. Body at 0.875rem (14px) with 1.6 line-height is the baseline. Don't increase sizes for "comfort"; the user is in a task, not reading a magazine.

## 4. Elevation

This system uses glassmorphism as a structural metaphor, not decoration. Semi-transparent panels with backdrop blur create a sense of layered containment: the vault has walls, and you can see through some of them. Depth is conveyed through tonal layering (abyss → vault → surface → surface-elevated) combined with glass panels for elevated containers.

### Shadow Vocabulary
- **Glow Subtle** (`box-shadow: 0 0 20px rgba(220, 38, 38, 0.15)`): Card hover state. A faint crimson halo that signals interactivity.
- **Glow Strong** (`box-shadow: 0 0 40px rgba(220, 38, 38, 0.25)`): Active focus states, highlighted elements. More intense, used sparingly.
- **Button Shadow** (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)`): Primary buttons. Subtle lift from the surface.
- **Glass Panel** (`backdrop-filter: blur(12-16px); background: rgba(17, 17, 24, 0.6-0.8)`): Elevated containers. The defining visual feature of the system.

### Named Rules

**The Purposeful Blur Rule.** Glass panels (backdrop-filter: blur) are used only for containers that need spatial context: navigation bars, modal overlays, elevated cards that float above content. If a container sits flat on the page surface, use a solid background (vault or surface), not glass. Glass without spatial purpose is decoration.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows and glows appear only as responses to state (hover, focus, elevation). No ambient shadows on static elements.

## 5. Components

### Buttons

Five variants forming a clear hierarchy from primary action to quiet utility.

- **Shape:** Gently curved edges (8px radius). Consistent across all variants.
- **Primary:** Crimson background (#DC2626), white text. Gradient from red-600 to red-700. Padding 10px 16px. Used for the single most important action on a screen.
- **Hover / Focus:** Background shifts to brighter crimson (#EF4444). Focus ring: 2px crimson with offset against dark backgrounds. Transition: 200ms ease-out.
- **Secondary:** Dark surface background (#1A1A24), secondary text (#A1A1AA), border (#27272A). Hover lifts border to crimson-tinted. For supporting actions.
- **Ghost:** Transparent background, secondary text. Hover adds subtle white overlay (5%). For tertiary actions, navigation, logout.
- **Outline:** Transparent background, crimson text, crimson-tinted border (40% opacity). For actions that need visibility without the weight of primary.
- **Danger:** Red-tinted background (red-900/50), red-300 text, red-800/50 border. For destructive actions like revoke.

### Cards / Containers

The vault's walls. Solid backgrounds with subtle borders, optional glass treatment for elevated contexts.

- **Corner Style:** Rounded edges (12px radius)
- **Background:** Vault (#111118) for standard cards. Glass fill (rgba(17,17,24,0.6)) with backdrop blur (16px) for elevated cards.
- **Border:** Border (#27272A) at rest. Hover shifts to crimson-tinted (rgba(220,38,38,0.2)).
- **Internal Padding:** 24px (CardContent), with header/footer sections at 16px vertical.
- **Glow Option:** Cards accept a `glow` prop that adds the subtle crimson glow on hover. Use sparingly; not every card should glow.

### Inputs / Fields

Dense, dark, functional. Inputs sit on the abyss background, one layer below the card they live in.

- **Style:** Stroke-only (border #27272A) on abyss background (#0A0A0F). Rounded edges (8px). Padding 10px 16px.
- **Focus:** Border shifts to crimson (#DC2626) with a 2px crimson focus ring. No glow, no animation; crisp state change.
- **Error:** Border shifts to red (red-600/50), focus ring matches. Error text in red-400 below the field.
- **Placeholder:** Ink muted (#52525B). Must maintain 4.5:1 contrast against abyss background.
- **Labels:** Label text (#A1A1AA) in label typography above the field.

### Badges

Small, pill-shaped indicators for status and categories.

- **Shape:** Fully rounded (9999px radius). Padding 2px 10px. Text at label size (0.75rem).
- **Default:** Border (#3F3F46), background (#27272A), text (#A1A1AA). Neutral state.
- **Success:** Emerald-tinted (bg emerald-900/30, text emerald-400, border emerald-800/40).
- **Warning:** Amber-tinted (bg amber-900/30, text amber-400, border amber-800/40).
- **Danger:** Red-tinted (bg red-900/30, text red-400, border red-800/40).
- **Info:** Sky-tinted (bg sky-900/30, text sky-400, border sky-800/40).
- **Red:** Crimson-tinted (bg red-600/20, text red-400, border red-600/30). Accent variant.

### Tables

Dense data display. Horizontal scroll wrapper for responsive behavior.

- **Header:** Abyss background (#0A0A0F at 60% opacity). Label typography, uppercase, tracking-wider.
- **Rows:** Divided by border (#27272A). Hover state adds subtle white overlay (2%).
- **Cells:** Padding 16px horizontal, 12px vertical (header) or 16px vertical (body). Text at body size.
- **Dividers:** Full-width rules at border color (#27272A).

### Navigation

Top-bar layout with glass treatment. Sticky positioning.

- **Style:** Glass fill (backdrop blur 12px, background rgba(17,17,24,0.8)) with border bottom (#27272A).
- **Logo:** Crimson gradient icon with white shield SVG. Brand name in gradient text.
- **Active State:** Crimson-tinted background (red-600/10), crimson text, crimson-tinted border.
- **Inactive State:** Tertiary text (#71717A). Hover lifts to white text with subtle white overlay (5%).
- **Spacing:** Horizontal gap 4px between nav items. Padding 12px per item.

## 6. Do's and Don'ts

### Do:
- **Do** use the tonal depth hierarchy (abyss → vault → surface → surface-elevated) for all container layering. Never place a vault-colored card directly on a surface-colored background.
- **Do** keep the crimson accent to ≤10% of any screen. Its rarity signals importance.
- **Do** use glass panels only for containers that float above content (nav, modals, elevated cards). Flat containers use solid backgrounds.
- **Do** maintain 4.5:1 contrast for all text against its background. Ink (#FFFFFF) on abyss (#0A0A0F) is 19.3:1. Ink secondary (#A1A1AA) on abyss is 8.6:1. Both pass.
- **Do** use Space Grotesk at the defined weights and sizes. No additional fonts.
- **Do** use `text-wrap: balance` on display and headline text for even line breaks.
- **Do** use semantic color variants (emerald for success, amber for warning, sky for info) consistently across all surfaces.

### Don't:
- **Don't** use glassmorphism for containers that sit flat on the page surface. That's decoration, not architecture. If it doesn't float, it doesn't blur.
- **Don't** use gradient text (`background-clip: text`) anywhere except the SIJAGA brand name in the navigation. It's a brand mark, not a design pattern.
- **Don't** introduce a second typeface. One family, weight contrast only.
- **Don't** use the crimson accent for backgrounds, large surfaces, or decorative elements. It's a signal color, not a paint.
- **Don't** place light text on dark backgrounds without verifying contrast. The #52525B (ink muted) color is for placeholders and disabled states only; it fails 4.5:1 on vault backgrounds.
- **Don't** use neon gradients, glowing borders, or excessive animation. This is a vault, not a trading terminal.
- **Don't** use generic crypto/Web3 dashboard aesthetics with purple gradients and neon accents. PRODUCT.md anti-reference.
- **Don't** use legacy university portal design patterns. PRODUCT.md anti-reference.
- **Don't** use playful fintech patterns that undersell the gravity of academic credentials. PRODUCT.md anti-reference.
