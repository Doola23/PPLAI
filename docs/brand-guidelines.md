# PLAI Brand Guidelines

## Color Palette

| # | Name | Hex | Role |
|---|------|-----|------|
| 01 | **Medium Slate Blue** | `#6666ff` | Primary accent: links, focus rings, sidebar active, role pills, charts, progress bars |
| 02 | **Periwinkle** | `#b8baff` | Tint / secondary accent: hover states, soft highlights |
| 03 | **Columbia Blue** | `#c9e8ff` | Tertiary tint: backgrounds, subtle fills |
| 04 | **Rich Black** | `#0c0c16` | Base backgrounds, page canvas |
| 05 | **Celadon** | `#b9f0d7` | Primary CTA: buttons, active filter pills, key highlights |

### CSS Variables
```css
--primary-accent:       #6666ff;   /* Medium Slate Blue */
--primary-accent-hover: #5555dd;
--primary-dark:         #3838aa;
--lime:                 #b9f0d7;   /* Celadon — CTA accent */
--lime-hover:           #a3e5c3;
--bg-black:             #0c0c16;   /* Rich Black */
--bg-dark:              #1a1a28;
--bg-darker:            #0d0d1a;
```

### Rules
- **Primary buttons** → `background: #b9f0d7, color: #0c0c16`. Never blue on a primary button.
- **Charts / progress bars** → Medium Slate Blue `#6666ff`. Never celadon on decorative elements.
- **Error / danger states** → `#ef4444` (red). Never blue for errors.
- **Active filter pills** → celadon background `#b9f0d7`, rich black text.
- Max 1 accent color per component. Do not mix celadon and slate blue in the same interactive element.

---

## Typography

- **Display / headers**: Miguer Sans (uppercase, weight 700–900)
- **Body / UI text**: System sans-serif stack
- **Code / monospace**: JetBrains Mono or similar
- Minimum body font size: 12px dashboard, 14px landing
- Line height: 1.5–1.65 for body copy

---

## Button Shape

- `borderRadius: 999` on **every** button, pill, and interactive control.
- Cards, containers, progress bars, and inputs are exempt.
- Banned on buttons: `borderRadius: 8`, `9`, `10`, `12`, `14`.

---

## Spacing & Layout

- Dashboard content padding: `28px 32px` desktop → `16px` mobile
- Section gaps: `20px` between dashboard blocks
- Card border-radius: `18px` standard, `12px` compact
- Grid system: CSS Grid with `repeat(auto-fit, minmax(..., 1fr))` for responsive layouts

---

## Responsive Breakpoints

| Breakpoint | Width | Action |
|------------|-------|--------|
| `480px` | xs | Single-column grids |
| `540px` | sm | Payment/form 1-col |
| `600px` | md-sm | Pricing mobile |
| `640px` | md | Player profile stack |
| `768px` | md | Dashboard 2-col → 1-col |

---

## Motion

- Entry animations: `opacity 0→1`, `y: 28→0`, `filter: blur(6px)→0`
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`
- Duration: 0.65–0.85s for page elements, staggered by 0.05s per item
- Hover: subtle `background` and `border-color` transitions, 150–250ms

---

## Component Tokens

| Component | Color |
|-----------|-------|
| Active nav item | Medium Slate Blue `#6666ff` |
| Primary CTA button | Celadon `#b9f0d7`, rich black text |
| Ghost button | Celadon border + text |
| Danger button | Red `#ef4444` |
| Role pills | Slate Blue border + text |
| Chart bars / progress | Slate Blue `#6666ff` |
| Confidence/success indicators | Celadon `#b9f0d7` |
| Error states | Red `#ef4444` |
| Match prediction pick pill | Slate Blue |
| Active season / filter pill | Celadon bg, rich black text |

---

## Logo & Brand Mark

- Product name: **PLAI**
- Tagline direction: AI-powered football intelligence
- Tone: precise, data-driven, premium sports tech
