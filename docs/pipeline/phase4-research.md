# Phase 4 Research — Polish, Differentiation & Reach

Scope: (15) announcement read receipts, (20) SOS button software stub (hardware security items are explicitly out of scope), (21) PWA/native-app-like reach + i18n scaffolding check, (23) protect transparent pricing (note only), (22) protect no-ads/support positioning (note only). Smallest phase in the pipeline — kept proportionate.

Same architecture caveat as Phases 2–3 apply: screens call `src/lib/services/api.ts` → `societyos-api` (out of reach). Supabase MCP tools are live against the real project and used directly below for schema facts.

---

## 1. Competitor notes (kept brief — small phase)

### Announcement read receipts

No major Indian society app (MyGate, ADDA, ApnaComplex, NoBrokerHood) documents a *named* "read receipt" feature for admin-posted notices, but the underlying mechanic is standard for any WhatsApp-delivered broadcast: WhatsApp Business API itself returns per-recipient delivery states (`sent` → `delivered` → `read`) via message status webhooks, and it's common practice for broadcast tools built on top of the API to expose delivered/read counts to the sender. [WhatsApp Business Platform message status](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples/), [Society management software round-up](https://www.softwaresuggest.com/housing-society-apartments-software). The gap in this product isn't the data — see §2, it already exists — it's that no screen surfaces it.

### SOS / panic-button UX

Consistent guidance across UX case studies and dedicated safety apps: the button should be large, high-contrast, one clear label (not icon-only), reachable one-handed, and require one deliberate tap rather than a multi-step flow so it works under stress; an MVP should (a) notify via at least one channel, (b) confirm receipt so the presser knows someone saw it, and (c) support escalation if unanswered. Several sources explicitly warn to make the "wrong" action (accidental triggers) hard without adding friction that slows a real emergency. [UX Case Study: SOS Mobile App](https://www.mahith.art/ux-case-study-sos-mobile-app), [UX Case Study: SOS Feature Implementation](https://medium.com/design-bootcamp/ux-case-study-sos-feature-implementation-3c92622f47ee), [How to Build a Personal Safety App with Emergency Alerts](https://koder.ai/blog/how-to-create-a-mobile-app-for-personal-safety-and-emergency-alerts). For residential societies specifically, the described pattern is resident → on-duty guard, not resident → emergency services — which matches what's buildable here without hardware or dispatch integration.

---

## 2. Announcements / read receipts — current state and spec

### Current state (read directly)

`src/admin/pages/Notices.tsx` is the whole announcements feature today: admin composes a notice (optional AI-polish rough-note → title/body), posts via `POST /api/notices`, lists notices with pinned-first sort. No read/delivery information is rendered anywhere in this file.

**The tracking data already exists at the schema layer** — this is the single most important finding for this item. Live Supabase tables:

- `public.notices` (3 rows): `id, society_id, title, body, pinned, posted_by_staff_id, posted_at, target ('all'|'selected')`
- `public.notice_recipients` (152 rows): `id, notice_id → notices, resident_id → residents, whatsapp_message_id, delivery_status ('pending'|'sent'|'delivered'|'read'|'failed')`

So a per-recipient `read` state is already modeled — it's WhatsApp's own delivery/read receipt (blue-tick equivalent), populated presumably by `societyos-api` from WhatsApp Cloud API status webhooks. Nothing in the current frontend queries `notice_recipients` or shows a count. The buildable slice is almost entirely UI + one API route, not new schema.

### Spec

**No new table needed** — `notice_recipients.delivery_status` already has a `'read'` state. Two additions:

1. **Admin-side read-count UI (primary deliverable).** On `Notices.tsx`, each notice card gets a small stat row, e.g. "142 sent · 118 delivered · 96 read". Backed by a new `societyos-api` route, e.g. `GET /api/notices/:id/recipients` or a rollup embedded in `GET /api/notices` (`{ notice, recipient_counts: { pending, sent, delivered, read, failed } }`). For a safety/shutdown notice specifically, add a "who hasn't read this" expandable list (resident name + unit) so an admin can manually follow up with stragglers — this is the actual "did they see it" use case from the report item, not just an aggregate number.
2. **In-app read tracking, for when a resident reads inside the (currently placeholder) resident portal rather than WhatsApp.** `resident/ResidentHome.tsx` today is an identity-only Phase-0 shell — there's no notices view yet for residents to read in-app. If/when a resident-facing notices screen ships, it should call a small `POST /api/notices/:id/read` on view, which the API maps to setting `notice_recipients.delivery_status = 'read'` for that resident (or a separate `read_at` timestamp column if the team wants to distinguish "WhatsApp read" from "in-app read" — worth a one-line schema decision by the API/DB owner, not blocking this phase). Until the resident portal has a notices screen, WhatsApp's own read receipt is the only read signal, and that's already flowing into `notice_recipients` today.

Net: this is a small, mostly-UI item. No RLS or migration work identified as required — `notice_recipients` already has RLS enabled.

---

## 3. SOS button — spec

### Current state

No SOS/panic/emergency feature exists anywhere in the repo (`grep` for sos/panic/emergency across `src/` returns nothing feature-related). The resident-facing app is currently just `src/resident/ResidentHome.tsx`, an explicitly-labeled Phase-0 placeholder shell ("Real resident-facing features... land in later phases"). Staff-side, `src/admin` and a `src/guard` layout (`GuardLayout`, `LogVisitor`, `VisitorLog`) exist and are the natural place for an admin/guard-facing "active alerts" screen.

### Spec

**New table** `public.sos_alerts`:
- `id uuid pk default gen_random_uuid()`
- `society_id uuid references societies`
- `resident_id uuid references residents`
- `unit_id uuid references units` (denormalized copy for guard-screen display without a join, matches the pattern `tickets` already uses with `resident_name`/`resident_phone`)
- `status text check in ('active','acknowledged','resolved') default 'active'`
- `raised_at timestamptz default now()`
- `acknowledged_by_staff_id uuid references staff_users, nullable`
- `acknowledged_at timestamptz, nullable`
- `resolved_at timestamptz, nullable`
- `note text, nullable` — optional context guard/admin adds on resolution

RLS scoped by `society_id` matching the existing pattern on every other table.

**Resident side**: a persistent, visible SOS entry point — given the resident app is still a placeholder, the natural spot is a fixed button on `ResidentHome.tsx` (and any future resident nav shell), large, high-contrast, single tap, with a confirmation step (e.g. press-and-hold 2 seconds, or tap-then-confirm) to avoid accidental fires per the UX research above. On press it does one thing: `POST /api/sos-alerts` (or a direct Supabase insert under RLS as a stopgap, matching this repo's existing pattern for out-of-reach-API screens) writing a `sos_alerts` row with `status = 'active'`. Show immediate on-screen confirmation ("Security desk alerted — [unit], [time]").

**Critical labeling requirement**: the button and every surrounding string must say something like **"Alert security desk"**, never "SOS", "Emergency", "Call 911/112", or any phrasing implying dispatch to police/fire/ambulance. This is a software-only internal alert to on-site guard/admin staff — there is no real emergency-service integration, and implying one would be actively dangerous if a resident relies on it during a real emergency and no one responds because it never left the building. This applies to button copy, confirmation toast, and any documentation/help text.

**Admin/guard side**: a new "Active alerts" screen (e.g. `src/guard/pages/ActiveAlerts.tsx`, or a section on `GuardLayout`/`AdminLayout`) listing `sos_alerts` where `status != 'resolved'`, sorted newest-first, showing resident name, unit, elapsed time since `raised_at`, with "Acknowledge" and "Resolve" actions writing `acknowledged_by_staff_id`/`acknowledged_at`/`resolved_at`. This closes the "confirm receipt" loop the UX research calls for — the resident's own screen could poll/subscribe to `sos_alerts.status` and show "Security desk notified" → "Guard is on the way" as it changes, using Supabase realtime on the row if the frontend talks to Supabase directly, or polling `GET /api/sos-alerts/:id` otherwise.

Out of scope, confirmed by the report's own framing: no hardware panic-button device, no wearables, no integration with actual police/ambulance dispatch, no facial recognition/ANPR to auto-verify who raised it — this is a same-building resident-to-guard alert only.

---

## 4. Reach: PWA, i18n, native app

### i18n scaffolding

None exists. `grep` across `src/` for i18n libraries (`react-i18next`, `react-intl`, `next-intl`, generic `locale`) returns no matches — all strings in the codebase are hardcoded English JSX literals throughout admin, guard, resident, and landing pages. Adding real multi-language support would mean introducing an i18n library, extracting every hardcoded string, and building a language-switch UX — a substantial, cross-cutting investment, not a Phase-4-sized task. Recommendation: **note as a larger future investment, do not attempt a partial extraction in this phase** — a half-migrated string layer is worse than none. The report's own framing (partially offset by the WhatsApp-first bet, since WhatsApp broadcast copy could theoretically be localized independently of the web UI) supports deferring this.

### PWA / installability (the practical "native-app-like" answer)

Real infrastructure already exists, but scoped to one role only:
- `public/manifest.webmanifest` — `name: "SocietyOS Gate Desk"`, `start_url: "/guard"`, `display: "standalone"`, guard-branded icons/colors.
- `public/sw.js` — a real service worker (cache-first-with-network-fallback for GET requests, versioned cache `societyos-gate-v1`), registered and precaching `["/guard", "/manifest.webmanifest", "/icon.png"]`. Matches the recent commit "Fix service worker precache list referencing missing icon.svg."

This PWA setup is **guard-only** — it installs as "SocietyOS Gate Desk" and only shells the `/guard` route. There is no manifest/install prompt for the resident-facing app (`/resident`) or the admin app (`/admin`) at all. Given the report frames "no native app" as a resident-facing gap primarily, the buildable slice here is: **add a second manifest (or a dynamic/role-aware one) and extend the service worker's precache list for the resident shell**, so residents can "Add to Home Screen" a `/resident`-scoped PWA the same way guards already can for `/guard`. This is genuinely low-effort since the pattern to copy already exists in this exact repo — it's a config/precache-list change, not new infrastructure.

---

## 5. Protect, don't build — notes only

### (23) Transparent pricing — finding: currently NOT protected, worth flagging upstream

Checked both surfaces:
- **Public marketing site** (`src/routes/landing-data.ts`, `faqs` array): the pricing FAQ answer is *"We don't publish a fixed price yet — cost depends on your society's size and needs. Send a request through the form below or ask the chat in the corner, and the team will get back to you directly."* This is a contact-us gate, not a published number — the opposite of the "transparent pricing" position the report says to protect.
- **In-app** `src/admin/pages/Subscription.tsx` (post-signup, admin-only) does render real numbers — `plans.price_paise` formatted via `formatINR`, billing cycle, feature list, invoice history — but this is only visible to an already-onboarded society, not a prospective customer evaluating the product.

This phase's brief says pricing is a "don't regress" item, so no build spec is written here per instructions — but the research surfaced that there's nothing to regress *from* on the public-facing side; the public site is already gated. Flagging this discrepancy for whoever owns positioning/product strategy rather than silently noting "confirmed fine," since the premise didn't hold.

### (22) No-ads / support positioning — note only

No ad-serving code, ad SDKs, or ad-slot components found anywhere in `src/` (repo-wide search for ad-related terms in components turned up nothing feature-related). `src/components/ui/PublicHelpChatWidget.tsx` exists as a live support surface on the public site. Nothing to build — consistent with "protect, don't fix."

---

## 6. Needs external credentials (stub only)

- **Facial recognition / ANPR / biometric hardware / patrol-check devices** — definitively out of scope for this phase and this product surface. These require camera/hardware vendor integration, computer-vision infra, and per-society physical installation; the report itself calls this hardware-dependent and harder to reach parity on. No stub UI recommended even — building a fake "facial recognition" toggle would be actively misleading about what the product does at the gate.
- **Regional language / translation service** — if pursued later, would need a translation API/service (e.g. Google Cloud Translation, Azure Translator, or a paid i18n-as-a-service platform) plus the i18n library scaffolding noted in §4. Needs its own credentials and its own phase; not scoped here.
- **Native app store distribution** — App Store (Apple Developer Program) and Google Play Console both require paid developer accounts, code-signing credentials, and a store-review process — out of scope entirely. The PWA work in §4 is the realistic substitute and needs no external credentials at all, since it reuses this repo's existing manifest/service-worker pattern.
- **SOS button reminder**: repeating here because it's safety-critical — the SOS feature built in §3 must never claim or imply a connection to real emergency dispatch (police/fire/ambulance, 100/101/108/112 in India, or 911-equivalents). Label it "Alert security desk" or equivalent, internal-only language, everywhere it appears — button copy, confirmations, any help text — so a resident never mistakes an unanswered in-app alert for a real emergency call that went through.
