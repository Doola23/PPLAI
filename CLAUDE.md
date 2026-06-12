# PLAI Project Instructions

## Typography — MANDATORY

**Miguer Sans is for headlines only (`h1`, `h2`, `h3`, `h4`). No exceptions.**
- Never apply `fontFamily: 'Miguer Sans'` to `div`, `span`, `p`, `td`, `li`, `button`, `label`, or any non-heading element.
- `globals.css` already applies Miguer to all heading tags globally — inline heading styles don't need to repeat it.
- Stat values, numbers, badges, labels, nav text, buttons → use inherited body font (DM Sans).

## Button Shape — MANDATORY

Read `docs/button-size-guide.md` before writing any button or interactive control.

**`borderRadius: 999` on every button, pill, and interactive control. No exceptions.**
Banned values on buttons: `borderRadius: 8`, `9`, `10`, `12`, `14` or any non-999 value.
Cards, containers, progress bars, and form inputs are exempt.

## Color Hierarchy — MANDATORY

Read `docs/color-guide.md` before writing any button, pill, or interactive control.

- **Black `#000000`** — base, backgrounds
- **Celtic Blue `#1A65D3`** — primary: buttons, links, focus rings, sidebar active, role pills, charts, progress bars
- **Anti-Flash White `#F2F2F2`** — text, headings, labels
- **Spanish Gray `#939A9E`** — muted text, subtext, inactive states. Never on buttons.
- **Dark Slate Gray `#2B4C5E`** — secondary surfaces, sidebar bg, card borders

**Primary buttons** → `background: '#1A65D3', color: '#F2F2F2'`. Never gray on a primary button.
**Charts / progress bars** → Celtic Blue `#1A65D3`.
**Spanish Gray** → muted/subtext only. Never as a button background.

## Auto Layout — MANDATORY

Every layout decision must work on **both web and mobile**. No exceptions.

- Never use fixed-pixel column widths (e.g. `340px`, `420px`) as inline styles — use responsive CSS classes (`layout-sidebar-right`, `layout-main-split`, etc.) defined in `dashboard.css`.
- Never add `gridTemplateColumns` as an inline `style` prop — it overrides media queries. Always use or create a CSS class.
- Every multi-column grid must collapse to single column on `max-width: 768px`.
- Every table or horizontally dense content must be wrapped in `.table-scroll-x` on mobile.
- Mobile view must be **100% visible** — no horizontal scrollbars, no clipped content.
- Add `min-width: 0` to all grid children to prevent content overflow.
- Test both viewport sizes before considering any layout task complete.

## ⛔ CRITICAL SECURITY — ENVIRONMENT FILES ⛔

> **THIS IS THE HIGHEST PRIORITY RULE. IT OVERRIDES EVERYTHING ELSE.**

### NEVER. TOUCH. ENV. FILES.

**🚨 NEVER read, open, print, log, grep, or expose `.env` files under ANY circumstance.**
**🚨 NEVER send, upload, or transmit any env content online — not to any server, API, service, or network request. Not even for debugging.**
**🚨 ALL `.env` work stays strictly LOCAL. No exceptions. No excuses.**

- Banned operations on `.env`, `.env.*`, or any secrets file: `Read`, `cat`, `grep`, `print`, `console.log`, or ANY tool
- AWS credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) live in `backend/.env` ONLY — never in frontend code, never committed to git, never transmitted anywhere
- If any env value or credential is needed → **ASK THE USER. Never access or upload it independently.**
- If JWT secrets or new vars need adding → tell the user the exact lines to paste themselves

**Violation of this rule is the worst possible action. Stop and ask instead.**

## Code Comments

Only add comments for genuinely complex logic (e.g. non-obvious algorithms, tricky workarounds, intricate state interactions). Do **not** add comments to straightforward or self-explanatory code.

## Communication Style

Remove all filler words. No 'the', 'is', 'am', 'are'. Direct answer only. Use short 3-6 word sentences. Run tools first, show result, then stop. Do not narrate. Example: Instead of 'The solution is to use async', say 'Use async'.
