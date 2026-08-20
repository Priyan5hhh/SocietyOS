# Phase 3 Research — Trust, Governance & Revenue Depth

Scope: (07) real-time guest pre-approval, (08) fraud/security signal review, (09) accounting depth (ledgers, GST invoices, Tally export, auto late fees), (10) defaulter export/report, (12) audit log screen, (13) governance (voting/AGM/document vault/owner-tenant records + deferred KYC), (19) self-serve subscription upgrade/payment. (11) pricing pressure from free rivals is a positioning note only, no build spec.

Same architecture caveat as Phase 2 (`docs/pipeline/phase2-research.md` §0) applies throughout: this repo's screens call `src/lib/services/api.ts` → `societyos-api` (out of reach), not Supabase directly. Every table below needs either a `societyos-api` route or, as a stopgap, direct `supabase-js` calls under RLS. I flag per-item which is cleaner.

---

## 1. Competitor patterns

### Guest pre-approval + gate-arrival notification

**MyGate** — resident opens the app, picks the visitor type (guest/delivery/cab/daily help), sets date/time, and approves in advance; can share an invite link with the guest directly. When an *unexpected* visitor arrives, the guard app sends a push to the resident, who approves/denies with one tap — no phone call. [Feature in Focus: Pre-Approval](https://mygate.com/blog/feature-in-focus/pre-approval/), [Pre-Approve Visitors](https://mygate.com/pre-approvals/), [How Pre-Approval works](https://help.mygate.in/articles/123614-how-does-the-guest-pre-approval-feature-work-on-mygate).

**ADDA** — same shape: in-app push notification when a guard logs a visitor, resident approves/denies from the notification itself, several notification-channel variants documented. [Visitor entry approval notifications](https://support.adda.io/portal/en/kb/articles/what-types-of-notifications-are-available-for-visitor-entry-approvals-on-the-adda-app).

**Convergent pattern**: two symmetric flows, not one — (a) resident-initiated pre-approval *before* the guest arrives (this repo already has half of this — see §2), and (b) guard-initiated live notification *at* the gate for walk-ins, with resident approve/deny replacing the guard's phone call.

### Fraud / security signal review

No competitor publishes a specific "same visitor at 3 flats" feature by that name, but the pattern is well established: **centralized, searchable, exportable visitor logs across all gates feeding one admin dashboard**, used by the committee to spot patterns and investigate incidents, plus staff/guard attendance and access history reviewed alongside it. None of the major four platforms document an automated fraud-scoring or flat-cross-reference alert as a named feature — this is a genuine differentiation opportunity for SocietyOS, not a "catch up" item. [Society Management Software Checklist](https://mygate.com/blog/housing-society/society-management-software-checklist/).

### Accounting depth (ledgers, GST invoices, Tally, late fees)

**ADDA** is explicitly the deepest here — full GST-compliant accounting and billing, auto-generated invoices with GST, "150+ audit-ready financial reports," per-flat financial ledgers with color-coded defaulter indicators, and configurable **late-payment interest** (rate + grace period, auto-applied). Data interchange with Tally is via **Excel export/import**, not a native API — ADDA explicitly documents exporting transactions to Excel for Tally import, and importing dues/payments back the same way. [GST accounting software](https://stage1.adda.io/home/housing-society-accounting-software.php), [Late payment interest setup](https://support.adda.io/portal/en/kb/articles/how-to-setup-late-payment-charges-for-utility-billing).

**ApnaComplex** — auto-calculated maintenance invoices, overdue notifications, and configurable late-payment penalties with "multiple options for adding penalties." [Managing late payments](https://blog.apnacomplex.com/2022/09/09/how-to-manage-late-payments-maximise-collections/).

**Legal context**: society late-fee interest is typically capped by cooperative society bylaws/model bylaws at **simple interest, max 21% per annum**, decided by general body resolution — not compounding, not arbitrary. [Late payment interest guideline](https://blog.apnacomplex.com/2011/08/07/how-to-calculate-maintenance-charges-for-your-apartment-association-or-how-to-share-common-expenses-in-a-housing-society/).

### Defaulter export/report

Standard pattern across the category: filter defaulters by **ageing bucket** (0-30/30-60/60-90+ days), amount, and flat/block, with one-click export and automated reminder dispatch scoped to the filtered list. Treasurers use this monthly, pre-meeting. [Top society accounting software](https://mygate.com/blog/housing-society/top-society-accounting-software/), [Treasurer checklist](https://mygate.com/blog/housing-society/treasurer-monthly-checklist/).

### Audit log

No competitor documents a customer-facing "audit log screen" as a named feature (it's usually implicit in their financial reports and "who approved this" traces). This repo already has the harder part — the backend `audit_log` table is populated (see §2) — so this is genuinely a fast win: a filterable read-only screen over data that already exists.

### Governance: voting/elections, AGM, document vault, owner/tenant records

**ADDA** — "Online Ballot": secure remote e-voting for AGM/committee elections, so non-resident owners can vote from anywhere; ADDA frames this as a differentiator over MyGate, whose strength stays visitor/gate management. [Online Ballot](https://adda.io/blog/2025/05/adda-online-ballot-for-society-elections/), [ADDA vs MyGate](https://adda.io/blog/2026/01/why-do-large-housing-societies-move-from-mygate-to-adda/).

**MyGate** — has online polls/surveys (lighter-weight than binding elections). [Online Polls & Surveys](https://mygate.com/blog/society-focus/apartment-erp-online-polling-surveys/).

**ApnaComplex** — **Document Repository**: admins/members upload documents (sale deeds, lease agreements, society bylaws, AGM minutes) tagged to a specific flat or the society at large, with **access-level control** (admin-only vs all-members); ApnaComplex also tracks **ownership history per flat** (resale/transfer events) as a distinct feature. [Document Repository launch](https://blog.apnacomplex.com/2010/06/07/document-repository-feature-launch/), [Access control](https://blog.apnacomplex.com/2010/08/13/apnacomplex-document-access-control/), [Ownership history tracking](https://blog.apnacomplex.com/2012/12/17/apnacomplex-management-tools-enhancement-track-ownership-history-of-every-flatvilla/).

**Legal grounding for elections**: Indian cooperative society acts and apartment ownership acts mandate periodic Management Committee elections by secret ballot (commonly every 5 years) — this isn't just a nice-to-have feature, societies are legally obligated to run them, which is why AGM/election tooling shows up as a governance-tier differentiator rather than a visitor-management add-on. [AGM voting overview](https://www.pin-communications.com/resources/pin-insights/agm-voting-postal-online-hybrid/).

**Takeaway**: document vault + owner/tenant records (with ownership-history) is the table-stakes half of item 13; voting/AGM is the harder, legally-sensitive half (see §4 on e-signature/voting integrity).

---

## 2. Current repo state (read directly)

- **Guest pre-approval already half-exists at the data layer.** `pre_approvals` table (society_id, unit_id, resident_id, guest_name, guest_phone, valid_until, consumed, consumed_at) is live in Supabase (1 row today) and `visitors.pre_approved` / `visitors.matched_pre_approval_id` already reference it. `src/guard/pages/LogVisitor.tsx` already reads `GET /api/pre-approvals?active=true` and matches on phone/name at the gate — the **guard-side consumption half works**. What's missing: (a) no resident-facing UI anywhere in this repo to *create* a pre-approval (item 07's actual gap), and (b) no gate-arrival push/WhatsApp notification back to the resident when an unmatched visitor shows up — `LogVisitor.tsx` just logs the visitor and moves on, there's no "notify resident" step.
- **`audit_log` table already exists and is populated** (53 rows today): `society_id, actor_staff_id, actor_type ('staff'|'system'|'ai'), action, entity_type, entity_id, before, after (jsonb), ip_address, created_at`. Confirms the report's claim exactly — "already recorded on the backend, just needs a UI." No screen anywhere reads this table (`grep` across `src/` for "audit" only hits `VisitorAccountability.tsx`, unrelated).
- **No fraud/security-signal detection exists anywhere.** `select routine_name from information_schema.routines` on the live DB returns exactly one function, `set_updated_at` (a generic `updated_at` trigger) — there is no same-visitor-cross-unit detection routine in the database despite the phase brief's framing. This needs to be **built from scratch**, not surfaced from an existing signal. The raw material is there (`visitors.phone` + `visitors.unit_id` + `visitors.check_in_at` is enough to detect the pattern via a query/materialized view), but "detected somewhere" should be corrected to "detectable, but not yet computed anywhere."
- **Zero accounting depth beyond the Phase-1 dues/payments loop.** `bill_cycles`, `dues`, `payments`, `payment_webhook_events` exist (Razorpay-shaped) but there is no ledger/journal table, no GST fields anywhere (no `gstin`, no tax breakdown columns), no late-fee columns on `dues`, and `invoices` (society→SocietyOS billing, Phase 1's own subscription invoices) is a different table from anything resident-facing. `src/admin/pages/Billing.tsx` only creates bill cycles and nudges dues — no invoice generation, no ledger view.
- **No defaulter-specific report/export anywhere.** `Billing.tsx` shows dues per cycle with a status filter implied by the table but no ageing bucket, no export button, no cross-cycle rollup per unit.
- **`src/admin/pages/Subscription.tsx` is confirmed view-only** — renders `subscription` + `invoices` from `GET /api/subscription`, no mutation call anywhere in the file (no `api.post`/`api.patch`). `subscriptions` table has `payment_method_label` (text, freeform — clearly a manually-set label today, not a live payment method object) and no `plan_id` self-service change path.
- **No governance tables exist at all** — no `elections`, `votes`, `documents`, or tenant/owner-history tables. `residents.is_owner` (boolean) is the *only* owner/tenant signal today — a flat true/false with no lease dates, no ownership-transfer history, no verification/KYC status. This matches the brief: full KYC/owner-tenant verification was deferred to this phase and there is currently nothing beyond the one boolean.
- **`plans`/`subscriptions`/`invoices`** (Phase 1 SocietyOS-level billing, i.e. what the society pays SocietyOS) are structurally the closest existing pattern for item 19's self-serve upgrade flow — same shape problem as resident-facing payments, reuse the same Razorpay stub pattern.

---

## 3. Buildable spec

### 3.1 Guest pre-approval + gate notification (item 07)

No new tables needed for the core loop — `pre_approvals` and `visitors` already model it. Add:

```sql
-- Track that a gate-arrival notification was sent to the resident and how they responded,
-- for the walk-in (non-pre-approved) case.
create table visitor_approval_requests (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  visitor_id uuid not null references visitors(id),
  unit_id uuid not null references units(id),
  resident_id uuid references residents(id),      -- null if no portal-linked resident found
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'timed_out')),
  notified_at timestamptz not null default now(),
  responded_at timestamptz,
  channel text not null default 'whatsapp' check (channel in ('whatsapp', 'portal_push')),
  created_at timestamptz not null default now()
);
```

Screens:
- **Resident portal** (new route under the Phase-0 resident shell, e.g. `/resident/pre-approvals`): list existing pre-approvals (from `pre_approvals`, filtered to the resident's own `unit_id`), a "Pre-approve a guest" form (name, phone, valid-until window) that `POST`s to `/api/pre-approvals`, and a live "someone's at the gate" card when a `visitor_approval_requests` row for their unit is `status='pending'`, with Approve/Deny buttons.
- **Guard flow** (`LogVisitor.tsx`): when `lookupPreApproval()` finds no match, instead of just logging and moving on, create a `visitor_approval_requests` row and show a "Notifying resident…" state; poll or subscribe for the response before letting the guard wave the visitor through (or let the guard override after a timeout, logged as `timed_out`).
- Notification delivery reuses the existing WhatsApp send path (same infra that sends bill/reminder notices) — no new integration.
- API: `POST /api/pre-approvals` (resident creates), `GET /api/pre-approvals?unit_id=` (resident's own), `POST /api/visitor-approval-requests` (guard creates on walk-in), `PATCH /api/visitor-approval-requests/:id` (resident approves/denies), `GET /api/visitor-approval-requests?status=pending&unit_id=` (resident polls, or use Supabase Realtime directly on the table since it's simple state).

### 3.2 Fraud / security signal review (item 08)

```sql
-- Materialized/computed rather than trigger-maintained, to start simple:
-- a scheduled job (or on-demand admin query) flags visitors whose phone
-- appears against >1 distinct unit within a rolling window.
create table security_flags (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  flag_type text not null default 'cross_unit_visitor'
    check (flag_type in ('cross_unit_visitor', 'frequent_denial', 'odd_hours')),
  visitor_phone text not null,
  unit_ids uuid[] not null,          -- the distinct units this phone visited
  visitor_ids uuid[] not null,       -- the underlying visitors.id rows that triggered this
  window_days integer not null default 30,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by_staff_id uuid references staff_users(id),
  reviewed_at timestamptz,
  detected_at timestamptz not null default now()
);
```
Detection query (run as a nightly job or on-demand admin refresh — no new infra, a scheduled Supabase edge function or cron on `societyos-api` is enough):
```sql
select phone, array_agg(distinct unit_id) as unit_ids, array_agg(id) as visitor_ids
from visitors
where check_in_at > now() - interval '30 days' and unit_id is not null
group by phone
having count(distinct unit_id) >= 3;
```
Screen: **`/admin/security`** — table of `security_flags` (status='open' first), phone + list of units + visitor timestamps, "Mark reviewed" / "Dismiss" actions (writes `reviewed_by_staff_id`, `reviewed_at`), and every review action itself gets written to `audit_log` (dogfooding item 12). Attach to `AdminLayout` nav.

### 3.3 Accounting depth: ledger, GST invoices, Tally export, auto late fees (item 09)

```sql
-- Double-entry-lite ledger: one row per financial event against a unit, not full GL.
-- Sufficient for society-level "financial ledger per flat" — matches ADDA's documented pattern.
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  unit_id uuid not null references units(id),
  entry_type text not null check (entry_type in ('due', 'payment', 'late_fee', 'credit_note', 'adjustment')),
  reference_type text not null check (reference_type in ('due', 'payment', 'manual')),
  reference_id uuid,                 -- dues.id or payments.id when applicable
  amount numeric not null,           -- positive = owed by unit, negative = paid/credited
  description text not null,
  balance_after numeric not null,    -- running balance for this unit, computed at insert time
  created_at timestamptz not null default now()
);
create index ledger_entries_unit_idx on ledger_entries (unit_id, created_at);

-- GST-compliant invoice numbering + line detail per due (extends the existing dues/payments loop)
create table gst_invoices (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  due_id uuid not null references dues(id),
  invoice_number text not null,      -- sequential per society per financial year, e.g. SOC001/2026-27/000042
  invoice_date date not null default current_date,
  taxable_amount numeric not null,
  cgst_amount numeric not null default 0,
  sgst_amount numeric not null default 0,
  igst_amount numeric not null default 0,
  total_amount numeric not null,
  society_gstin text,                -- null if society isn't GST-registered (common for small societies below threshold)
  pdf_imagekit_url text,
  created_at timestamptz not null default now(),
  unique (society_id, invoice_number)
);

-- Late fee configuration, per report's "automatic late fees" gap
alter table society_configs
  add column late_fee_rate_annual_pct numeric not null default 0 check (late_fee_rate_annual_pct >= 0 and late_fee_rate_annual_pct <= 21),
  add column late_fee_grace_days integer not null default 0;

alter table dues
  add column late_fee_amount numeric not null default 0 check (late_fee_amount >= 0),
  add column late_fee_applied_at timestamptz;
```
Notes:
- `late_fee_rate_annual_pct` is capped at 21% in the check constraint deliberately, mirroring the model-bylaw ceiling found in research (simple interest, general-body-set rate) — the UI should surface that ceiling so admins don't set something legally invalid for a cooperative society.
- Late-fee application is a scheduled job (society_configs-driven): for each `due` past `due_date + grace_days` and still unpaid, compute simple interest on `amount`, write `late_fee_amount`/`late_fee_applied_at`, and insert a `ledger_entries` row (`entry_type='late_fee'`).
- GST invoice numbering must be **sequential and gap-free per financial year per GSTIN** to be compliant — `unique (society_id, invoice_number)` plus generation logic that increments off the last invoice for that society+FY, no gaps even for voided invoices (void via a status field if ever added, never delete/renumber).

Screens:
- **`/admin/ledger`**: per-unit running balance view, filterable by unit/block, drill into a unit's full `ledger_entries` history.
- **`Billing.tsx` extension**: "Generate GST invoice" action per due (writes `gst_invoices`, renders/downloads a PDF — templating can be simple HTML→PDF, no new integration), late-fee column added to the dues table showing computed `late_fee_amount`.
- **`/admin/settings` (or wherever `society_configs` is edited)**: late-fee rate + grace-days fields.
- **Tally export**: see §4 — this is buildable for real, not a stub.

### 3.4 Defaulter export/report (item 10)

No new tables — this is a query/view + export button over `dues` + new `ledger_entries`.
```sql
create view defaulters as
select
  d.society_id, d.unit_id, u.block, u.unit_number,
  count(*) filter (where d.status = 'overdue') as overdue_count,
  sum(d.amount + d.late_fee_amount) filter (where d.status = 'overdue') as total_overdue,
  min(d.due_date) filter (where d.status = 'overdue') as oldest_due_date,
  (current_date - min(d.due_date) filter (where d.status = 'overdue')) as max_ageing_days
from dues d join units u on u.id = d.unit_id
group by d.society_id, d.unit_id, u.block, u.unit_number
having count(*) filter (where d.status = 'overdue') > 0;
```
Screen: **`/admin/defaulters`** — table over the `defaulters` view, filter by ageing bucket (0-30/30-60/60+ derived client-side from `max_ageing_days`) and block, "Export CSV" button (client-side CSV generation from the already-fetched rows — no backend export endpoint needed), and a "Remind all" bulk action reusing the existing `queueBulkReminders` helper already used in `Billing.tsx`.

### 3.5 Audit log screen (item 12)

No new table — `audit_log` already exists and is populated. Purely a screen:
- **`/admin/audit-log`**: read-only table over `audit_log`, filters for `entity_type`, `actor_type`, `action`, and date range; each row expandable to diff `before`/`after` jsonb side-by-side (the data's already shaped for this — a simple JSON diff view, no library needed for the field-level granularity these rows have). Add to `AdminLayout` nav. This is the single fastest win in the whole phase — data exists, just needs `GET /api/audit-log` (or direct `supabase-js` read since it's pure read-only CRUD with no business logic, matching Phase 2's recommendation for tables like this).

### 3.6 Governance: voting/AGM, document vault, owner/tenant records (item 13)

```sql
-- Document vault
create table documents (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  unit_id uuid references units(id),        -- null = society-wide document (bylaws, AGM minutes)
  title text not null,
  category text not null check (category in ('bylaws', 'agm_minutes', 'sale_deed', 'lease_agreement', 'noc', 'other')),
  imagekit_url text not null,
  imagekit_file_id text not null,
  visibility text not null default 'admin_only' check (visibility in ('admin_only', 'unit_residents', 'all_residents')),
  uploaded_by_staff_id uuid references staff_users(id),
  created_at timestamptz not null default now()
);

-- Ownership/tenancy history per unit (addresses the deferred-KYC half honestly, without claiming full KYC)
create table unit_occupancy_history (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  unit_id uuid not null references units(id),
  resident_id uuid references residents(id),
  occupancy_type text not null check (occupancy_type in ('owner', 'tenant')),
  start_date date not null,
  end_date date,                      -- null = current
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'document_uploaded', 'verified')),
  verifying_document_id uuid references documents(id),
  created_at timestamptz not null default now()
);

-- Elections
create table elections (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  title text not null,                -- "Managing Committee Election 2026"
  description text,
  voting_opens_at timestamptz not null,
  voting_closes_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'cancelled')),
  eligibility text not null default 'one_vote_per_unit' check (eligibility in ('one_vote_per_unit', 'one_vote_per_owner')),
  created_by_staff_id uuid references staff_users(id),
  created_at timestamptz not null default now()
);

create table election_candidates (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id),
  resident_id uuid references residents(id),
  name text not null,
  statement text,
  display_order integer not null default 0
);

create table election_votes (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id),
  unit_id uuid not null references units(id),        -- vote is tied to unit, not resident, for one_vote_per_unit
  candidate_id uuid not null references election_candidates(id),
  voted_at timestamptz not null default now(),
  unique (election_id, unit_id)   -- enforces one vote per unit per election at the DB level
);
```
Screens:
- **`/admin/documents`** (or resident-facing `/resident/documents` mirrored view respecting `visibility`): upload form (category, unit link, visibility), list/filter by category and unit, reuses existing ImageKit auth pattern.
- **`/admin/elections`**: create election + candidates, open/close voting, live tally view (`count(*) group by candidate_id` over `election_votes` — never expose per-unit vote mapping in the tally UI even though it's technically joinable, to preserve ballot secrecy in spirit).
- **Resident portal `/resident/vote`**: shown only while an election's `status='open'` and the resident's unit hasn't voted yet; candidate list + statements, single vote submission enforced by the `unique (election_id, unit_id)` constraint.
- **`/admin/units/:id` occupancy tab**: shows `unit_occupancy_history` timeline, "Upload verifying document" action that creates a `documents` row and links it via `verifying_document_id`, manual "Mark verified" toggle for admin (this is the honestly-scoped version of KYC — document collection + manual admin verification, not automated identity verification).

### 3.7 Self-serve subscription upgrade/payment (item 19)

No new tables — `plans`/`subscriptions`/`invoices` already model what's needed; this is UI + one write path.
- **`Subscription.tsx` extension**: "Change plan" button opens a modal listing `plans` (already have `price_paise`, `features`, `unit_limit`), selecting one calls `POST /api/subscription/change-plan` (updates `subscriptions.plan_id`, and either prorates the current invoice or opens a new one — business-logic detail for whoever builds it, not this doc's call to make). "Update payment method" button — see §4, this is where the stub applies.

---

## 4. Needs external credentials (stub only)

| Item | Verdict | Reasoning |
|---|---|---|
| **Tally export** | **Buildable for real, no external credentials needed.** | Confirmed by research: ADDA itself doesn't use a live Tally API — it exports to **Excel/CSV**, which Tally imports manually. Same approach here: a `GET /api/ledger/export?format=csv` (or client-side CSV from `ledger_entries`) in Tally's expected column layout (date, voucher type, ledger name, amount, narration) is a real, complete feature — not a stub. No Tally account, license, or API key required. |
| **GST invoice generation** | **Buildable for real**, with one caveat. | Generating a correctly-numbered, correctly-computed GST invoice (sequential numbering, CGST/SGST split, taxable value) is pure computation — no external service needed, and the `gst_invoices` schema above supports it fully. The caveat: a society only *needs* to charge GST if it's GST-registered (has a GSTIN) and crosses the threshold, or if it charges commercial rates above ~₹7,500/month/member (per common cooperative-society GST rules) — `society_gstin` is nullable specifically so unregistered societies can still get a clean receipt (no tax lines) rather than a fabricated one. Not a stub; it's a real feature with a real "not applicable" state. |
| **Payment gateway for automatic late-fee charge** | **Stub**, same dependency as Phase 1. | Late-fee *calculation* (§3.3) is real and unstubbed — computing the amount needs no gateway. *Auto-charging* it (as opposed to just adding it to the next bill for manual payment) needs a saved payment method / mandate via Razorpay, which Phase 1 already stubs (`societies.razorpay_key_id` present but no live keys per Phase 1's `NEEDS_YOUR_INPUT.md` entries). Recommend: land late fees as a **line item added to the next due**, payable through the existing (already-stubbed) payment flow — don't build a separate auto-debit mandate flow until Phase 1's gateway is live. |
| **Subscription self-serve payment (item 19)** | **Stub**, same Razorpay dependency. | "Change plan" (writing `subscriptions.plan_id`) is real and buildable now. "Update payment method" needs a live Razorpay/Stripe customer-vault integration this repo doesn't have yet — stub it as a disabled button or a "contact support to update payment method" fallback until the gateway from Phase 1 is live, same as the late-fee item above. |
| **E-signature / voting integrity for elections** | **Simple real implementation, not a stub — explained below.** | Full legal e-signature (Aadhaar eSign, DocuSign-grade non-repudiation) is out of scope and would need a paid third-party integration with no existing hook in this repo — that part should stay unbuilt rather than faked. But *ballot integrity* for a society-internal election doesn't legally require that: the `unique (election_id, unit_id)` DB constraint already gives one-vote-per-unit enforcement, and voting through an already-authenticated resident session (Phase 0's OTP-verified login) already gives "this vote came from a verified resident of this unit" — which is the actual integrity bar most societies' internal elections operate at today (a show of hands or physical ballot has *less* auditability than this). Build the real thing at that scope; do **not** stub a fake "signature" UI that implies stronger legal guarantees than it has — that would be actively misleading to a treasurer/secretary relying on it for a legally-mandated election. |

---

## 5. Note on item 11 (pricing pressure from free rivals)

Not a build item — noted per the brief. Free/cheap rivals (society-run WhatsApp groups, generic visitor-log apps, free tiers of competitors) compete on price, not depth; the entire Phase 3 bundle (accounting depth, governance, audit trail, fraud signals) is SocietyOS's answer to that pressure — the report's own framing is that depth, not price, is the moat once a society outgrows a free tool. No schema or screen follows from this item.
