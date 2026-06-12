# PLAI Color Guide

## Palette

| # | Name | Hex | RGB |
|---|------|-----|-----|
| 01 | Celtic Blue | `#1A65D3` | (26, 101, 211) |
| 02 | Black | `#000000` | (0, 0, 0) |
| 03 | Spanish Gray | `#939A9E` | — |
| 04 | Anti-Flash White | `#F2F2F2` | — |
| 05 | Dark Slate Gray | `#2B4C5E` | (43, 76, 96) |

---

## Hierarchy

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Base | Black | `#000000` | Page backgrounds, card surfaces |
| Primary Accent | Celtic Blue | `#1A65D3` | Primary buttons, links, focus rings, sidebar active, charts, progress bars |
| Text | Anti-Flash White | `#F2F2F2` | Body text, headings, labels |
| Muted / Secondary | Spanish Gray | `#939A9E` | Subtext, ghost UI, inactive states |
| Deep Accent | Dark Slate Gray | `#2B4C5E` | Secondary surfaces, sidebar background, card borders |

---

## Rules

1. **Primary buttons** — `background: #1A65D3`, `color: #F2F2F2`. No exceptions.
2. **Active filter/toggle pills** — `background: #1A65D3`, `color: #F2F2F2`.
3. **Secondary / ghost buttons** — Dark Slate Gray border + Spanish Gray text, transparent background.
4. **Links & focus rings** — Celtic Blue (`#1A65D3`).
5. **Sidebar active item** — Celtic Blue highlight.
6. **Role pills** — Celtic Blue.
7. **Charts, progress bars, sparklines** — Celtic Blue fill.
8. **Hover glow on primary buttons** — `box-shadow: 0 8px 24px rgba(26,101,211,0.4)`.
9. **Hover glow on ghost buttons** — `box-shadow: 0 8px 24px rgba(43,76,96,0.4)`.
10. **Muted text** — Spanish Gray (`#939A9E`). Never as a button background.

---

## Quick Reference — Inline Style

```tsx
// Primary CTA button (Celtic Blue)
background: '#1A65D3', color: '#F2F2F2'

// Active filter pill (Celtic Blue)
background: '#1A65D3', color: '#F2F2F2'

// Ghost / secondary button (Dark Slate Gray)
background: 'transparent', border: '1px solid rgba(43,76,96,0.5)', color: '#939A9E'

// Sidebar active (Celtic Blue)
background: 'rgba(26,101,211,0.12)', color: '#1A65D3'

// Chart / progress bar fill (Celtic Blue)
background: '#1A65D3'

// Link / focus ring (Celtic Blue)
color: '#1A65D3'

// Muted / subtext
color: '#939A9E'

// Secondary surface / card border
background: '#2B4C5E'
```

---

## Anti-Patterns (Never Do)

- ❌ Spanish Gray as a button background
- ❌ Celtic Blue text on Anti-Flash White (low contrast — check ratio first)
- ❌ Two primary Celtic Blue buttons side by side with equal weight
- ❌ Dark Slate Gray as primary CTA
- ❌ Black text on Black background
