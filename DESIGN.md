---
version: alpha
name: Carenium
description: Premium healthcare-nursing platform. Clinical-trust, medical-tech aesthetic: deep teal + champagne gold on slate navy, Fraunces serif display + Inter UI.
colors:
  primary: "#0B5E6B"
  primary-cyan: "#1297A9"
  accent: "#C9A24B"
  accent-deep: "#9C7B2E"
  base: "#142B3D"
  surface: "#FFFFFF"
  background: "#F4F8FA"
  success: "#1E8449"
  warning: "#D4AC0D"
  danger: "#C0392B"
  border: "#DDE3EA"
  text-muted: "#64748B"
  white: "#FFFFFF"
typography:
  display-wordmark:
    fontFamily: Fraunces
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: 0.12em
  headline-lg:
    fontFamily: Fraunces
    fontSize: 26px
    fontWeight: 700
    lineHeight: 1.15
  headline-md:
    fontFamily: Fraunces
    fontSize: 19px
    fontWeight: 700
    lineHeight: 1.3
  headline-sm:
    fontFamily: Fraunces
    fontSize: 15.5px
    fontWeight: 700
    lineHeight: 1.4
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Inter
    fontSize: 13.5px
    fontWeight: 500
    lineHeight: 1.4
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.05em
  stat-number:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 800
    lineHeight: 1.1
  mono-id:
    fontFamily: "Courier New"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.12em
rounded:
  sm: 8px
  md: 14px
  lg: 16px
  xl: 18px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 28px
  section: 20px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.base}"
    rounded: "{rounded.sm}"
    padding: 12px
    typography: "{typography.label-lg}"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.base}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: 12px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    padding: 12px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    borderColor: "{colors.border}"
  card-header-title:
    typography: "{typography.headline-sm}"
    textColor: "{colors.base}"
  sidebar:
    backgroundColor: "{colors.base}"
    textColor: "{colors.white}"
  sidebar-nav:
    textColor: "rgba(255,255,255,0.66)"
    typography: "{typography.label-lg}"
  sidebar-nav-active:
    backgroundColor: "rgba(201,162,75,0.12)"
    textColor: "{colors.white}"
  hero-card:
    backgroundColor: "#0B5E6B"
    textColor: "{colors.white}"
    rounded: "{rounded.lg}"
  stat-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  stat-card-value:
    typography: "{typography.stat-number}"
    textColor: "{colors.base}"
  status-timeline-done:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
  status-timeline-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.base}"
  nav-link:
    typography: "{typography.label-lg}"
  input:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.border}"
    rounded: "{rounded.sm}"
---

# Carenium — DESIGN.md (Google Stitch compatible)

This is the master design system for the **Carenium** healthcare-nursing platform.
It is written in the open-source [DESIGN.md format](https://github.com/google-labs-code/design.md)
so it can be imported directly into **Google Stitch**, exported to Tailwind/DTCG,
and followed by any AI coding agent. Every value matches the implemented
`frontend/src/index.css` tokens and `BrandIcons.jsx` icon set.

---

## Overview

Carenium is a premium nurse-career platform: recruit nurses, verify their
documents (KYC), run interviews, issue CARE IDs, and manage duty shifts. The UI
must feel **calm, clinical-trustworthy, and precise** — like a medical device,
not a startup splash page.

- **Personality:** premium, calm, confident, medical-tech.
- **Emotional response:** trust + safety + quiet confidence.
- **Voice of the UI:** sparse text, generous whitespace, serif headlines for
  authority, gold used sparingly for the single primary action per screen.
- **Reference feel:** modern hospital administration software, high-end
  fintech/health dashboards.

## Colors

The palette is rooted in deep teal + slate navy with a single champagne-gold
accent. Teal = primary/brand, gold = the *one* action per screen, navy =
structure/text, white/`#F4F8FA` = surfaces.

- **Primary — Deep Teal (#0B5E6B):** brand identity, active links, primary
  gradients, sidebar glows, "done" states.
- **Primary Active — Cyan (#1297A9):** focus rings, hover, secondary accents,
  info tints.
- **Accent — Champagne Gold (#C9A24B):** the single most important CTA per
  screen, status highlights, wordmark accent, active timeline step.
- **Accent Deep (#9C7B2E):** gold hover/pressed.
- **Base — Slate Navy (#142B3D):** sidebar, page titles, body text.
- **Surface (#FFFFFF) / Background (#F4F8FA):** cards on page mist.
- **Semantic:** Success #1E8449, Warning #D4AC0D, Danger #C0392B.

Tint convention for chips/badges/tiles: the base color at 6–14% opacity
(`rgba(18,151,169,0.10)` for cyan, `rgba(201,162,75,0.14)` for gold,
`rgba(11,94,107,0.08)` for teal) with a matching `border` at 30–45% opacity.

## Typography

Two families: **Fraunces** (high-contrast serif, flared chiseled serifs) for the
wordmark and all display/headline text; **Inter** for every UI surface (body,
forms, tables, badges, buttons). Use the tokens defined in the front matter.

- **Wordmark:** `CARE<em>NIUM</em>` — Fraunces 800, letter-spacing 2–3px, the
  `<em>` in gold (`CARE**NIUM**` color accent).
- **Headlines:** Fraunces 700, tight line-height, navy.
- **Body / labels / tables:** Inter. Labels and kickers may be uppercase with
  letter-spacing 0.5–1.6px.
- **Mono:** CARE-ID numbers use Courier New, 13px/700, letter-spacing 3px.

## Layout

Desktop-first, fluid. A fixed 240px app sidebar + fluid content area (gutter
28px, 14px on mobile). Auth pages use a full-viewport split: brand panel 58% +
form panel 42% (brand panel hidden below 920px).

- Spacing uses a 4px scale (4/8/12/16/20/24/28/32). Cards pad 20px; section gap
  20px; page gutter 28px.
- Grids: `.stats-grid` (auto-fill, min 200px), `.cols-3` (exactly 3), and
  `.two-col-grid` (1:1). Collapse to 1 column under 768px.
- Mobile: sidebar becomes a slide-over drawer; sticky frosted header keeps a
  hamburger + title + actions.

## Elevation & Depth

Depth comes from **layered gradients + soft teal-tinted shadows**, not heavy
drops. Shadow values:

- Resting cards: `0 1px 4px rgba(11,94,107,0.08)`.
- Hover lift: `0 10px 28px rgba(11,94,107,0.14)`.
- Dropdowns/modals: `0 12px 40px rgba(9,25,38,0.18)`.
- Gold CTAs: `0 6px 16px rgba(201,162,75,0.28)` (deepens on hover).

Hero banners use 3-stop gradients: `#0B5E6B → #0D4A56 → #142B3D` with cyan and
gold radial glows in the corners.

## Shapes

Soft, medical-tech radius: buttons/inputs 8px, cards 14px, hero cards 16px,
auth card 18px, chips/pills 9999px. Never mix sharp and rounded corners in one
view. Stat-icon tiles are 12px.

## Components

- **Button (primary):** gold gradient (`#C9A24B → #9C7B2E`), navy text 700,
  gold glow shadow; hover = 1px lift + deeper glow; disabled 60% opacity.
  Secondary = teal outline on white; danger = `#C0392B` white text.
- **Sidebar:** slate navy + radial cyan glow; logo in a white 40px rounded
  tile; active nav = gold left bar + gold icon + 12% gold-tinted row.
- **Top header:** frosted white (92% + blur 10px), sticky, Fraunces 19px title,
  gold-count notification bell, teal-outline role chip.
- **Card:** white, 1px `#DDE3EA` border, 14px radius, teal shadow; header =
  Fraunces 15.5px navy; body 20px.
- **Hero card:** navy gradient, white text, gold status chip, gold hero icon,
  kicker uppercase 11px; used for dashboards and welcome banners.
- **Stat card:** 28px/800 navy number, 12px muted label, 46px icon tile
  (cyan 10% / gold 14%).
- **Status timeline:** 26px dots — done = teal gradient + gold check; active =
  gold gradient + navy number with expanding gold pulse ring; connecting lines
  teal→cyan when done.
- **Input:** 1px border, 8px radius; focus = cyan border +
  `0 0 0 3px rgba(18,151,169,0.16)`.
- **Icons:** inline SVG line icons (1.8px stroke, round caps). No emoji.

## Do's and Don'ts

- Do use gold only for the single primary action per screen.
- Do keep every card/table/modal on `#FFFFFF` over `#F4F8FA` page mist.
- Do use Fraunces only for display/headlines; Inter for everything else.
- Do show state on hover and focus on every interactive element.
- Do respect `prefers-reduced-motion` (disable all animation).
- Don't use emoji anywhere in the UI — SVG line icons only.
- Don't hardcode hex in component code — reference tokens/classes.
- Don't mix more than two font weights on one screen.
- Don't use gradients with more than three stops.
- Don't convey status by color alone — pair color with text labels.

---

## Pages (project prompts)

Status legend: `DONE` = implemented & verified · `BUILD` = prompt to implement.

### Auth

**Login `/login` — DONE.** Split 58/42. Left: teal→navy gradient, drifting
blurred orbs, drone SVG watermark (9% opacity), 58px logo tile + wordmark,
Fraunces headline, gold tagline, 3 gold-check bullets, animated gold EKG
stroke, uppercase footer. Right: `#F4F8FA→#E6F0F3` gradient; frosted glass card
(white 74%, blur 18, radius 18, strong teal shadow, 0.5s rise-in). Email +
password with eye toggle, teal focus, gold full-width "Sign In", teal links,
session-expiry note. Hide left panel < 920px. Preserve auth/redirect logic.

**Register `/register` — DONE.** Same shell. 3-step wizard (Personal → License →
Credentials) with gold dot progress; back + gold Continue; final gold "Submit
Registration"; teal "pending approval" note; sign-in link.

**Set New Password `/set-password` — DONE.** Same shell; gold first-login
warning, read-only email, new/confirm with toggles, gold submit, slate sign-out.

### Nurse Portal

**Dashboard `/dashboard` — DONE.** Four stage variants sharing the hero card +
gold status chip + brand timeline + gold/teal quick actions:
- A (KYC Pending): gold "KYC Pending" chip, document status card (gold X/5,
  teal progress bar).
- B (KYC Approved): "Verified" chip, Interview active on timeline.
- C (Interview passed): gold "Interview Passed / Selected" pill, journey
  timeline all-done.
- D (Full Access): gold "Full Access Active" chip, collapsible tracker,
  `.cols-3` stat cards, brand 3D-flip Nurse ID card + upcoming shifts list
  (day badge, TODAY gold chip, shift chip, priority dots).

**Documents `/documents` — DONE.** Gold-tinted alert card for flagged/expired
docs with red "Re-upload". Two-column: upload card (pill doc-type chips, expiry
field, dashed teal dropzone with gold hover, gold upload button) + per-document
list (name, status badge green/gold/amber/red, "expires in N days" amber
countdown). Teal success panel when all submitted. Keep upload logic.

**Working Shift `/working-shift` — DONE.** Centered locked card: teal lock
icon, serif "This Section is Locked", large mono CARE-ID input (teal focus),
3-attempt ring (gold→red), amber remaining-count text, gold "Unlock Full
Access". Lockout state = red-tinted alert card, serif "Account Temporarily
Locked", 24h countdown + contact-admin note. Redirect if full access already
active.

**Duty `/duty` — DONE.** Top: teal "Next duty" hero strip (date, ward, shift,
location, gold "Acknowledge"). Summary: 4 stat cards (Total/Today/Upcoming/
Completed, Today gold-tinted). Duty table card: filter chips (active teal),
PDF/DOCX export outlines, today rows gold-tinted, shift chips (Morning cyan /
Evening gold / Night purple / Emergency red), priority dots, status badges,
gold "Acknowledge". Keep filtering/export/acknowledge logic.

**Requests `/requests` — DONE.** Branded coming-soon: teal SVG icon, serif
heading, muted description, slate-outline locked chip with gold lock.

**Profile `/profile` — DONE.** Two-column: Account Info card (label/value rows,
teal dividers, role chip) + Change Password card (show/hide toggles). OTP flow
as a modal (gold "Send OTP", 6 digit boxes, "Resend OTP", gold-check success).

### Platform Admin Portal

**Admin Dashboard `/admin` — BUILD.** 6 clickable stat cards (Total Nurses, KYC
Pending, KYC Approved, Interview Sessions, Awaiting Result, Active Nurses) with
brand tints + gold counts. Two-column KYC Pending (gold Review) / Awaiting
Result (teal Results) cards. Hospital Admins summary + quick actions.

**Nurse Registry `/admin/nurses` — BUILD.** Toolbar: status filter chips, CSV
export, gold "Assign N to Interview". Registry table with teal checkboxes,
status badges, gold Review KYC. KYC Review = right slide-in drawer (navy
header, gold/green KYC banner, document rows, "X of Y docs viewed" progress,
gold Approve / red Reject).

**Interviews `/admin/interviews` — BUILD.** Gold "Create Interview Session";
venue master card (gold upload CSV, green sample, slate format hint); sessions
table with red "Expired" chips; awaiting-result table with gold "Record
Result"; create + result modals (gold submit; green/red selection buttons).

**System ID `/admin/system-id` — BUILD.** Gold "Bulk Email" dropdown, "N passed
· M failed" counts; candidates table with gold mono CARE-ID chips, gold
Send/Resend (slate when sent), red "Reset Lockout"; slate empty state.

**Hospital Admins `/admin/hospital-admins` — BUILD.** Counts header + gold
create; inline create grid; Active/Pending/Archived tabs with gold underline;
table with navy hospital chips + red/green activate actions; deactivate modal
(red confirm); created-account modal (dashed mono temp password, gold copy).

### Hospital Admin & Dept Head

**Hospital Admin `/hospital-admin` — BUILD.** Teal accent; welcome banner
(hospital name serif, gold line); stats (Active Nurses / Total Tasks / Tasks
Today); department performance grid (pending count gold); tabbed card: Nurses /
Task History / Dept Heads (gold create).

**Dept Head `/dept` — BUILD.** Slate-navy accent; welcome banner (department
name serif, gold); stats (Nurses / Total Tasks / Pending / Acknowledged);
tabbed card: My Nurses (gold "Assign Task") + Task History; Assign Task slide-in
panel (navy header, nurse chip, full form, gold assign).

---

## Responsive breakpoints

- `<920px`: hide auth brand panel.
- `<768px`: sidebar → drawer; hamburger in header; single-column forms;
  `.stats-grid` 2 cols; `.cols-3` 2 cols; `.two-col-grid` 1 col; hide hero
  icon/EKG.
- `<520px`: `.stats-grid` 1 col; gutter 14px; hide sidebar role chip.

## Quality gates

1. `npm run build` passes.
2. `npx eslint` clean on all touched files.
3. Zero emoji (SVG icons only).
4. No raw hex in components — tokens/classes only.
5. Validate this file: `npx @google/design.md lint DESIGN.md`.
