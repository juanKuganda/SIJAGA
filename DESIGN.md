---
name: SIJAGA
description: "Sistem Jaminan Autentikasi Gelar Akademik — blockchain-verified academic credentials"
colors:
  crimson-deep: "#B91C1C"
  crimson: "#DC2626"
  crimson-bright: "#EF4444"
  crimson-glow: "#F87171"
  crimson-pale: "#FECACA"
  background: "#FFFFFF"
  foreground: "#09090B"
  muted: "#F4F4F5"
  muted-foreground: "#71717A"
  border: "#E4E4E7"
  input: "#E4E4E7"
  emerald: "#10B981"
  amber: "#F59E0B"
  sky: "#38BDF8"
typography:
  display:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
  title:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Inter, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
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
---

# Design System: SIJAGA (Light Mode Bento Grid)

## 1. Overview

**Creative North Star: "Modern Enterprise Bento"**

SIJAGA's interface is a secure yet welcoming portal for academic credentials. The design leverages a light, clean aesthetic with a strict white/black/red palette. We use the popular "Bento Grid" layout approach for dashboards and landing pages to organize information in clear, distinct, and visually appealing cards. Typography is bold and modern, moving away from standard defaults to give a premium, anti-mainstream enterprise feel.

**Key Characteristics:**
- **Light Mode First**: Crisp white backgrounds (`#FFFFFF`) with dark gray/black text (`#09090B`).
- **Crimson Brand Accent**: Red (`#DC2626`) is the primary brand color, used for primary actions, logos, and emphasis.
- **Bento Grid Layouts**: Dashboards and feature sections use grid-based card layouts with consistent padding and subtle borders/shadows.
- **Bold Typography**: Heavy font weights (700-900) for headings to create a strong, confident brand voice.
- **Shadcn Components**: Standardized UI components (Cards, Buttons, Inputs, Tables) built with a clean, unopinionated base, customized to our palette.

## 2. Colors: The Clean Palette

A high-contrast light system punctuated by a deliberate crimson accent. 

### Primary
- **Crimson** (#DC2626): The primary brand color.
- **Crimson Deep** (#B91C1C): Hover state for primary buttons.
- **Crimson Bright** (#EF4444): Success/active states requiring high visibility.

### Neutral: Backgrounds
- **Background** (#FFFFFF): The main page background. Clean, pure white.
- **Muted** (#F4F4F5): Secondary backgrounds, disabled states, subtle card headers.
- **Border/Input** (#E4E4E7): Borders for cards, tables, and form inputs.

### Neutral: Text
- **Foreground** (#09090B): Primary text. Headings, data values, active labels. Near black.
- **Muted Foreground** (#71717A): Body text, descriptions, secondary information.

### Semantic
- **Emerald**: Success states (bg-emerald-50, text-emerald-700, border-emerald-200).
- **Amber**: Warning states (bg-amber-50, text-amber-700, border-amber-200).
- **Blue/Sky**: Info states (bg-blue-50, text-blue-700, border-blue-200).
- **Red/Destructive**: Error states or revoke actions (bg-red-50, text-red-700, border-red-200).

## 3. Typography

**Font Family:** Inter or system-ui sans-serif.

**Character:** Bold, modern, and highly legible. We use heavy weights for headings to establish a strong structural hierarchy.

### Hierarchy
- **Display** (Weight 900, clamp(2rem, 5vw, 3.75rem), line-height 1.05, tracking-tight): Hero headlines on the landing page.
- **Headline** (Weight 800, 1.875rem, line-height 1.2): Section headings, page titles.
- **Title** (Weight 700, 1.25rem, line-height 1.3): Card titles, subsection headings.
- **Body** (Weight 500, 0.875rem, line-height 1.6): All body text, descriptions.
- **Label** (Weight 700, 0.75rem, uppercase, tracking-wider): Table headers, badges, metadata labels.

## 4. Components & Elevation

We use shadcn/ui components extensively.

- **Cards**: Flat white backgrounds with a subtle border (`border-border`). On hover, they gain a subtle shadow (`hover:shadow-md transition-shadow`) to encourage interaction.
- **Buttons**:
  - `default`: Crimson background, white text.
  - `secondary`: Light gray (`muted`) background, dark text.
  - `outline`: Transparent background, border, dark text.
  - `destructive`: Red background or text for dangerous actions.
  - `ghost`: Transparent, hover effects only.
- **Badges**: Use semantic colors. Instead of solid dark backgrounds, we use soft tinted backgrounds (e.g., `bg-emerald-50 text-emerald-700 border border-emerald-200`) for a modern, premium look.
- **Icons**: Lucide-react icons. Standard size `w-4 h-4` or `w-5 h-5`.

## 5. Do's and Don'ts

### Do:
- **Do** use the Bento Grid approach for dashboards: distinct cards that group related information.
- **Do** use heavy font weights (extrabold, black) for page titles and hero headings.
- **Do** use tinted backgrounds for badges and alert blocks (e.g., `bg-blue-50 text-blue-700`) rather than solid aggressive colors.
- **Do** use Lucide icons consistently.

### Don't:
- **Don't** use dark mode classes (`dark:bg-slate-900`, etc.). The app is strictly light mode.
- **Don't** use generic Material Symbols if they are breaking (which they were); rely entirely on `lucide-react`.
- **Don't** clutter cards. Let the whitespace within the bento boxes breathe.
