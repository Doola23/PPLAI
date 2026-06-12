# PLAI Button Size Guide

## Overview

All interactive buttons across the PLAI platform must use one of the five standard size tokens below.
This ensures touch-target compliance (≥44px for primary CTAs), visual hierarchy, and brand consistency.

---

## ⚠️ Global Shape Rule — MANDATORY

> **ALL buttons, pills, and interactive controls use `borderRadius: 999` (fully rounded pill shape). No exceptions.**

This applies to every button across every page — landing, dashboard, auth, payment, pricing.
`borderRadius` values of 8, 9, 10, 12, 14 etc. are **banned** on buttons and interactive controls.

Cards, containers, progress bars, inputs, and decorative elements are exempt from this rule.

---

## Size Tokens

| Token | Height | Padding | Font Size | Font Weight | Border Radius | Use Case |
|-------|--------|---------|-----------|-------------|---------------|----------|
| `btn-xs` | 28px | `3px 9px` | 10px | 700 | **999px** | Status badges, filter chips, `DPill` |
| `btn-sm` | 32px | `7px 14px` | 11px | 700 | **999px** | Dashboard action buttons, `DBtn` |
| `btn-md` | 40px | `0 14px` | 14px | 500 | **999px** | Nav text links, `.lnav__link` |
| `btn-lg` | 44px | `0 20px` | 13px | 700 | **999px** | Nav CTAs, landing buttons, `HoverBorderGradient` |
| `btn-xl` | 52px | `0 28px` | 14px | 700 | **999px** | Hero primary CTAs, `.lbtn` |

---

## Components Mapped to Tokens

### Landing Page
| Component | Token | Notes |
|-----------|-------|-------|
| `.lbtn` (hero CTAs) | `btn-xl` | 52px, lime background |
| `HoverBorderGradient` | `btn-lg` | 44px min-height, animated border |
| `.lnav__link` | `btn-md` | 40px, nav text links |
| `.lnav__btn` | `btn-lg` | 44px, nav pill buttons |
| `CTA role pills` `.lrole` | `btn-sm` | 32px, role selector |

### Dashboard
| Component | Token | Notes |
|-----------|-------|-------|
| `DBtn` (ghost/outline/lime) | `btn-sm` | 32px, dashboard action buttons |
| `DFilterPill` | `btn-sm` | 32px, filter tabs inside `DFilterGroup` |
| `DFilterGroup` | — | Container: `borderRadius: 999`, `padding: 4` |
| `DPill` | `btn-xs` | 28px, status badges only |

### Auth Pages
| Component | Token | Notes |
|-----------|-------|-------|
| Submit buttons | `btn-xl` | 52px, full-width form submit |
| Google OAuth button | `btn-lg` | 44px |
| Password toggle | — | Icon-only, 44×44px touch target |

### Payment & Pricing
| Component | Token | Notes |
|-----------|-------|-------|
| Primary submit (Pay Now) | `btn-xl` | 52px |
| Secondary (Back / Cancel) | `btn-lg` | 44px |
| Payment method selectors | `btn-lg` | 44px height |
| Billing toggle pills | `btn-sm` | Active: lime bg, dark text |

---

## Rules

1. **`borderRadius: 999` on every button** — fully rounded pill shape, no exceptions.
2. **Never go below 44px** for any primary interactive button visible to the user (Apple HIG / Material).
3. **`btn-xs` and `btn-sm`** are exempt from the 44px rule as they are supplementary controls (filters, badges, secondary actions) with sufficient surrounding space.
4. **All buttons must have `cursor: pointer`** and a clear hover/active state.
5. **Touch spacing**: minimum 8px gap between adjacent buttons.
6. **Disabled state**: `opacity: 0.38`, `cursor: not-allowed`, no interaction.
7. **Letter spacing**: uppercase buttons use `0.06em–0.14em`; sentence-case buttons use default.

---

## Quick Reference — Inline Style

```tsx
// btn-xs — DPill / status chip
padding: '3px 9px', fontSize: 10, fontWeight: 700, borderRadius: 999, minHeight: 28

// btn-sm — DBtn / DFilterPill / dashboard action
padding: '7px 14px', fontSize: 11, fontWeight: 700, borderRadius: 999, minHeight: 32

// btn-md — nav link
height: 40, padding: '0 14px', fontSize: 14, fontWeight: 500, borderRadius: 999

// btn-lg — HoverBorderGradient / nav CTA / payment method selector
minHeight: 44, padding: '0 20px', fontSize: 13, fontWeight: 700, borderRadius: 999

// btn-xl — hero / form submit / primary CTA
height: 52, padding: '0 28px', fontSize: 14, fontWeight: 700, borderRadius: 999
```

---

## Anti-Patterns (Never Do)

- ❌ `borderRadius` other than `999` on any button or interactive control
- ❌ Raw `<button>` with arbitrary inline padding and no size token
- ❌ Buttons shorter than 28px on any visible UI
- ❌ Primary CTA buttons below 44px height
- ❌ Two primary buttons of equal visual weight side by side
- ❌ Missing hover/focus states
- ❌ `cursor: default` on clickable elements
