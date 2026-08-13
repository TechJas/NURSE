# CARENIUM — Full Application Design Prompt (paste into Google Stitch)

> **How to use:** Load this file into the DESIGN.md panel if you can, otherwise paste the whole thing as the prompt. For best fidelity click **Standard** mode (use **Thinking** for the Dashboard + Nurse Registry screens, **3 Flash** for quick drafts). Ask it to generate one screen at a time in the order below, keeping the shared shell/nav identical across screens.

---

## 1. Project brief

Design the complete UI for **Carenium**, a premium healthcare nurse-career platform. It recruits nurses, verifies their documents (KYC), runs interviews, issues CARE IDs, and manages duty shifts across four roles: **Nurse**, **Platform Admin**, **Hospital Admin**, and **Department Head**.

The UI must feel **calm, clinical-trustworthy, and precise** — like a medical device, not a startup splash page. Personality: premium, calm, confident, medical-tech. Emotional response: trust + safety + quiet confidence. Reference feel: modern hospital administration software, high-end health/fintech dashboards.

Voice of the UI: sparse text, generous whitespace, serif headlines for authority, and **gold used sparingly for exactly one primary action per screen**.

---

## 2. Design tokens (inline — do not deviate)

**Colors**
- Primary deep teal `#0B5E6B` — brand identity, active links, primary gradients, sidebar glows, "done" states
- Primary cyan `#1297A9` — focus rings, hovers, secondary accents, info tints
- Accent champagne gold `#C9A24B` — the single primary CTA per screen, status highlights, wordmark accent, active timeline step
- Accent deep `#9C7B2E` — gold hover/pressed
- Base slate navy `#142B3D` — sidebar, page titles, body text
- Surface `#FFFFFF` / Background `#F4F8FA` — cards on page mist
- Semantic: Success `#1E8449`, Warning `#D4AC0D`, Danger `#C0392B`, Border `#DDE3EA`, Text muted `#64748B`

**Tint convention:** chips/badges/tiles use a base color at 6–14% opacity — `rgba(18,151,169,0.10)` cyan, `rgba(201,162,75,0.14)` gold, `rgba(11,94,107,0.08)` teal — with a matching border at 30–45% opacity.

**Typography** — two families
- **Fraunces** (high-contrast serif) for the wordmark and all display/headlines: `CARE**NIUM**` wordmark (Fraunces 800, letter-spacing 2–3px, the "NIUM" in gold); headlines Fraunces 700 tight navy
- **Inter** for everything else: body 14/13px, labels 12–13.5px, uppercase kickers with letter-spacing 0.5–1.6px, stat numbers 28px/800
- **Mono:** CARE-ID values use Courier New, 13px/700, letter-spacing 3px

**Shapes** — medical-tech soft radius: buttons/inputs 8px, cards 14px, hero cards 16px, auth card 18px, chips/pills 9999px, stat-icon tiles 12px. Never mix sharp and rounded in one view.

**Spacing** — 4px scale (4/8/12/16/20/24/28/32); cards pad 20px; section gap 20px; page gutter 28px (14px mobile).

**Elevation** — layered gradients + soft teal-tinted shadows, not heavy drops: cards `0 1px 4px rgba(11,94,107,0.08)`; hover lift `0 10px 28px rgba(11,94,107,0.14)`; modals `0 12px 40px rgba(9,25,38,0.18)`; gold CTAs `0 6px 16px rgba(201,162,75,0.28)`. Hero banners use 3-stop gradients `#0B5E6B → #0D4A56 → #142B3D` with cyan + gold radial glows in corners.

**Icons** — inline SVG line icons (1.8px stroke, round caps). **No emoji anywhere.** Use: dashboard-grid, documents, key, calendar, settings, nurse, interview, ID-card, hospital, user, task, bell, menu, logout, pulse/EKG, lock, eye/eye-off, check, upload, alert-triangle, clock, refresh, close, download, package, mail, pin.

---

## 3. Shared layout (app shell for all non-auth screens)

- **Sidebar:** fixed 240px slate-navy `#142B3D`, radial cyan glow top-left. Top: 40px white rounded tile containing the Carenium logo (white tile required so the opaque-white logo blends in), next to `CARE**NIUM**` wordmark (white with gold "NIUM"). Nav items: gold 3px left bar + gold icon + 12% gold-tinted row for the active link; white 66%-opacity for inactive; gold lock icon tag on locked/disabled items. Bottom: role chip (teal outline) + "Sign Out" (white icon + text).
- **Header:** sticky, frosted white (92% + blur 10px), hamburger on mobile, Fraunces 19px page title, gold-count notification bell (dropdown panel with SVG icons per type), teal-outline role chip.
- **Content:** page mist `#F4F8FA`, gutter 28px (14px mobile). Cards always `#FFFFFF` on mist.
- **Mobile:** sidebar collapses to a slide-over drawer; hamburger reveals it.

---

## 4. Core components

- **Primary button:** gold gradient `#C9A24B → #9C7B2E`, navy 700 text, gold glow shadow, hover = 1px lift + deeper glow. **One per screen.**
- **Secondary button:** teal outline on white. **Danger button:** `#C0392B`, white text.
- **Card:** white, 1px `#DDE3EA`, radius 14, teal shadow; header = Fraunces 15.5px navy; body 20px.
- **Hero card:** navy gradient, white text, gold status chip, gold icon, uppercase 11px kicker; used for dashboards and welcome banners.
- **Stat card:** 28px/800 navy number, 12px muted label, 46px icon tile (cyan 10% or gold 14%).
- **Status timeline:** 26px dots — done = teal gradient + gold check; active = gold gradient + navy number with expanding gold pulse ring; connecting lines teal→cyan when done.
- **Input:** 1px border, 8px radius; focus = cyan border + `0 0 0 3px rgba(18,151,169,0.16)`.
- **Badges/chips:** pill radius; status always color + text label (never color alone).

**Motion:** EKG stroke trace animation on auth brand panel, drifting blurred orbs, gold pulse on active timeline/CTAs. Respect `prefers-reduced-motion` (disable all animation).

---

## 5. Screens to build

### A. Auth (no sidebar — full-viewport split 58/42)

**A1. Login** — Left brand panel: teal→navy gradient, drifting blurred orbs, drone SVG watermark at 9% opacity, 58px logo tile + `CARE**NIUM**` wordmark, Fraunces headline, gold tagline, 3 gold-check bullets, animated gold EKG stroke, uppercase footer. Right form panel: `#F4F8FA→#E6F0F3` gradient; frosted glass card (white 74%, blur 18, radius 18, teal shadow, 0.5s rise-in). Email + password with eye toggle, teal focus, gold full-width "Sign In", teal "Forgot password?" and "Create account" links, session-expiry note. Hide left panel below 920px.

**A2. Register** — Same shell. 3-step wizard (Personal → License → Credentials): gold dot progress indicator, back + gold Continue per step, final gold "Submit Registration", teal "pending approval" note, sign-in link. Steps: name/email/phone; specialization/experience/upload documents; password + confirm.

**A3. Set New Password** — Same shell; gold first-login warning banner, read-only email, new/confirm password with show/hide toggles, gold submit, slate sign-out link.

### B. Nurse portal (role: nurse)

**B1. Dashboard** — Hero card + gold status chip + brand journey timeline + gold/teal quick actions. Four stage variants:
- **A (KYC Pending):** gold "KYC Pending" chip, document status card (gold "X of 5", teal progress bar).
- **B (KYC Approved):** "Verified" chip, Interview step active on timeline.
- **C (Interview passed):** gold "Interview Passed / Selected" pill, timeline all-done.
- **D (Full Access):** gold "Full Access Active" chip, collapsible tracker, 3 stat cards (Today's Shift / Total Duties / Upcoming), brand 3D-flip Nurse ID card (tap to flip; front = gradient + name + position + mono CARE-ID, back = details grid), upcoming shifts list (day badge, TODAY gold chip, shift chip, priority dots), quick actions (View All Duties / My Documents / Dashboard).

**B2. Documents** — Gold-tinted alert card for flagged/expired docs with red "Re-upload" buttons. Two-column: (1) upload card — pill doc-type chips, license expiry date field, dashed teal dropzone with gold hover and drag-drop, gold "Upload" button; (2) per-document list — name, status badge (green Uploaded / gold Re-upload Needed / amber Expires Soon / red Expired / slate Pending), "expires in N days" amber countdown. Teal success panel ("All documents submitted!") when all 5 uploaded.

**B3. Working Shift** — Centered locked card: teal lock icon in circle, Fraunces "This Section is Locked", large Courier-New CARE-ID input (centered, letter-spacing 3, teal focus ring), 3-attempt dot ring (gold → red as attempts are used), amber remaining-count text, gold "Unlock Full Access". Lockout state: red-tinted alert card, Fraunces "Account Temporarily Locked", 24-hour countdown + contact-admin note.

**B4. Duty** — Teal "Next Duty" hero strip (date, ward, shift time, location, gold "Acknowledge" button when assigned). Summary: 4 stat cards (Total / Today gold-tinted / Upcoming / Completed). Duty table card: filter chips (All/Today/Upcoming/Completed, active = teal pill), outline PDF + DOCX export buttons, today's rows gold-tinted, shift chips (Morning cyan / Evening gold / Night purple / Emergency red), priority dots (red/amber/green), status badges (Assigned/Acknowledged/Completed), gold "Acknowledge" per assigned row.

**B5. Requests** — Branded coming-soon: teal SVG package icon in a soft tile, Fraunces heading, muted description ("available once your working schedule has been assigned"), slate-outline pill with gold lock + "Section Locked — Coming Soon".

**B6. Profile** — Two-column: (1) Account Info card — label/value rows separated by teal dividers, gold role chip; (2) Change Password card — current/new/confirm with show-hide eye toggles, gold "Send OTP to Email". OTP flow in a modal: 6 separate digit boxes (auto-advance, backspace-back), "Resend OTP" link, gold "Verify & Change", then a gold-check success panel.

### C. Platform Admin portal (role: platform admin)

**C1. Admin Dashboard** — 6 clickable stat cards (Total Nurses, KYC Pending, KYC Approved, Interview Sessions, Awaiting Result, Active Nurses) with brand tints and gold counts. Two-column below: KYC Pending card (gold "Review" buttons) + Awaiting Result card (teal "Results"). Hospital Admins summary strip + quick actions.

**C2. Nurse Registry** — Toolbar: status filter chips, CSV export button, gold "Assign N to Interview" (count of checked rows). Registry table: teal checkboxes, status badges, gold "Review KYC". KYC Review opens a right slide-in drawer: navy header, gold/green KYC banner, document rows, "X of Y docs viewed" progress bar, gold "Approve KYC" + red "Reject" actions.

**C3. Interviews** — Gold "Create Interview Session" button; venue master card (gold "Upload CSV", green sample download, slate format hint); sessions table with red "Expired" chips; awaiting-result table with gold "Record Result". Two modals: create session (gold submit) and record result (green Passed / red Failed selection buttons).

**C4. System ID** — Gold "Bulk Email" dropdown; "N passed · M failed" counts; candidates table with gold mono CARE-ID chips, gold Send/Resend buttons (slate when already sent), red "Reset Lockout"; slate empty state when nothing to issue.

**C5. Hospital Admins** — Counts header + gold "Create"; inline create grid; Active / Pending / Archived tabs with gold underline; table with navy hospital chips + green/red activate-deactivate actions; deactivate confirmation modal (red confirm); created-account modal (dashed-border mono temp password, gold "Copy").

### D. Hospital Admin & Dept Head portals

**D1. Hospital Admin** — Teal accent. Welcome banner (hospital name in Fraunces, gold accent line). Stats: Active Nurses / Total Tasks / Tasks Today. Department performance grid (pending counts in gold). Tabbed card: Nurses / Task History / Dept Heads, with gold "Create" actions.

**D2. Dept Head** — Slate-navy accent. Welcome banner (department name in Fraunces, gold). Stats: Nurses / Total Tasks / Pending / Acknowledged. Tabbed card: My Nurses (gold "Assign Task") + Task History. Assign Task = right slide-in panel (navy header, nurse chip, full task form, gold "Assign").

---

## 6. Responsive

- `<920px`: hide auth brand panel.
- `<768px`: sidebar → slide-over drawer, hamburger in header, single-column forms, stat grids 2 cols, two-column grids 1 col, hide hero icon/EKG.
- `<520px`: stat grids 1 col, gutter 14px, hide sidebar role chip.

## 7. Quality gates

1. Zero emoji — inline SVG line icons only.
2. Gold = exactly one primary CTA per screen.
3. Fraunces only for display/headlines; Inter everywhere else.
4. No more than two font weights per screen; no gradients over 3 stops.
5. Never convey status by color alone — always pair with a text label.
6. Every interactive element shows hover and focus states.
7. Respect `prefers-reduced-motion`.
8. Keep the shared shell (sidebar + header) pixel-identical across all app screens.
