# Phase 2 Research — Core Competitive Parity

Scope: (03) Amenity booking, (05)/(16)/(17)/(18) Facility Manager bundle (vendor/AMC tracking, repair cost/photo/equipment history, staff attendance, staff list visibility), (06) reliable intake (admin-side scope only — the WhatsApp/AI bot itself lives in the separate `societyos-api` repo, out of reach here).

---

## 0. Architecture finding that shapes everything below (read first)

This frontend does **not** call Supabase directly. `src/lib/services/api.ts` is a thin fetch wrapper that talks to `VITE_API_BASE_URL` — the `societyos-api` backend, a **separate repo not available to this pipeline**. Every existing screen (`TicketQueue.tsx`, `Staff.tsx`, etc.) calls `api.get/post/patch/delete("/api/...")`, never Supabase client SDK. The Supabase MCP tools available in this session talk to the DB directly, which is useful for inspecting schema and applying migrations, but **new UI cannot go live against new tables** unless matching REST endpoints exist. This repo currently has zero `supabase/migrations` and no `supabase-js` usage in `src/`.

Implication for the spec (and for whoever builds Phase 2 after this doc): this document specifies the **data model** (as SQL/migration-shaped table definitions, since `apply_migration` is available via MCP) and the **screens + the API contract they need** (`GET/POST /api/amenities`, etc.), but the actual Express/edge-function handlers behind those routes are `societyos-api` work, out of this repo's build scope. Flag this explicitly to Agent 2 (spec) and Agent 3 (build): either (a) the API contract below gets implemented in `societyos-api` in a coordinated PR, or (b) as a stopgap, new Phase-2 screens call `supabase-js` directly with RLS-scoped policies (staff JWT already carries `society_id`/`role` per the existing `staff_users` table pattern used by RLS elsewhere). Recommend (b) for tables that are pure CRUD with no cross-cutting business logic (amenities, vendors, staff_attendance, ticket cost fields) so Phase 2 isn't blocked on a repo it can't touch — reserve `societyos-api` routes only where the bot needs to write the same tables (e.g. AI-created tickets already do this via `/api/tickets`).

---

## 1. Competitor patterns

### Amenity booking

**MyGate** — slot-and-calendar hybrid: admins configure each amenity as either **slot-based** (gym, pool, tennis court — fixed time blocks) or **full-day** (guest room, clubhouse). Residents see real-time availability and book directly with "zero wait time" for most amenities; MyGate also documents a distinct **complete-booking vs partial-booking** admin setting per amenity, implying some amenities require admin approval and others are instant-book. Advance-booking windows are configurable per amenity (e.g. "book only 24h ahead"), and MyGate supports **bulk/recurring bookings** (weekly/monthly/quarterly/yearly) for regulars like a badminton court slot. Cancellation/rescheduling is self-serve. [Amenities' Booking](https://mygate.com/blog/feature-in-focus/amenities-booking-2/), [Amenities module](https://adminfaq.mygate.com/articles/130149-what-is-the-amenities-module-and-how-does-it-work), [complete vs partial booking](https://adminfaq.mygate.com/articles/129541-what-is-complete-booking-and-partial-booking-section-under-edit-amenity), [bulk booking slots](https://adminfaq.mygate.com/articles/128584-how-can-we-configure-bulk-booking-slots-for-amenity), [advance booking window](https://adminfaq.mygate.com/articles/128580-we-want-the-residents-to-be-able-to-book-amenity-24hrs-before-the-slot-opening-time-how-to-configure-this).

**NoBrokerHood** — similar slot-calendar model; residents pick date/time in a short flow ("book in 4 steps"), get instant confirmation, and the system prevents double-booking. Explicitly tracks usage analytics per amenity (most/least used) for society decision-making. No public detail on approval-gated vs instant amenities or pricing model. [Amenities Management](https://www.nobrokerhood.com/amenities-management), [Book in 5 steps](https://www.nobrokerhood.com/blog/schedule-and-book-amenities-or-classes-in-less-than-5-steps/).

**ADDA** — "Common Facilities for Online Booking" with configurable **booking parameters** (who can book, blackout windows, time restrictions) and **online payment at time of booking** for paid amenities (banquet halls, guest rooms typically charge; gym/pool typically free). Also bundles event scheduling on top of plain slot booking. [ADDA facility booking](https://blog.ind.adda.io/2025/01/event-management-in-housing-society/), [pricing/features](https://www.softwaresuggest.com/apartment-adda).

**ApnaComplex** — "Facility Booking" module (part of its broader Facility Management Software), positioned alongside asset management and gate/attendance tools; documented in their help center as a standard calendar-booking flow. [Facility Booking help](https://help.apnacomplex.com/module/facility-booking/), [Facility Management Software](https://www.apnacomplex.com/facility-mgmt-tools).

**Convergent pattern across all four**: (1) admin defines amenities with a type (slot-based vs full-day/event), operating hours, capacity, and optional fee; (2) resident books a specific date+slot from real-time availability; (3) some amenities auto-confirm, others queue for admin approval (typically the ones with a fee or exclusive/whole-facility use, e.g. banquet hall); (4) cancellation is self-serve up to some cutoff; (5) admin gets a calendar/list view across all amenities to spot conflicts and no-shows.

### Facility-manager modules

**ApnaComplex** — biometric or app-based **staff attendance** (residents can also see whether staff checked in), and an **asset management** module where admins register asset groups (lifts, fire equipment, pumps, electrical fittings, borewells) and the module surfaces upcoming service/replacement dates. [Asset & staff](https://www.apnacomplex.com/apartment-security).

**ADDA** — **vendor management**: vendor master records, purchase orders, invoices, an inventory/consumption tracker, and **AMC (annual maintenance contract) tracking** integrated with the accounting module so vendor payments post straight to the ledger. [Vendor & AMC](https://apartmentadda.com/home/housing-society-management-accounting.php).

**General CMMS pattern** (industry-wide, not India-society-specific, but what "repair cost/asset history" competitors are converging toward): every repair/ticket against an asset logs parts+labor cost and is tied back to the asset's service record, so a facility manager can see total cost-of-ownership per asset over time and make repair-vs-replace calls; AMC contracts are tracked with renewal dates, SLA terms (response time, fix time), and vendor performance history. [AMC/CMMS pattern](https://www.mapcon.com/blog/2025/10/annual-maintenance-contracts-explained-or-the-role-of-cmms), [repair cost tracking](https://www.mydock365.com/annual-maintenance-contract-management-software).

**Takeaway for SocietyOS**: none of these are exotic — vendor list + AMC expiry dates, a cost/photo field pair on ticket resolution, and a simple attendance check-in/out table cover the reported gap. No competitor requires anything beyond what this repo's existing Supabase + REST pattern already supports.

---

## 2. Current repo state (read directly)

- `src/facility/FacilityLayout.tsx` — nav is a single item, `{ to: "/facility", label: "Ticket Queue", icon: Ticket, end: true }`; the route (`src/App.tsx` line ~64-67) renders the exact same `TicketQueue` component admins see at `/admin/tickets`. No facility-scoped filtering, no other pages. This is the "empty role" the report describes.
- `src/admin/pages/Staff.tsx` is mounted only at `/admin/staff` (`src/App.tsx` line 32); there is no facility-manager-visible staff list anywhere.
- `src/admin/pages/TicketQueue.tsx` already has: status filter, staff assignment dropdown (fed by `/api/staff`), AI "urgent" flag batch call, resident nudge/reminder actions, and a floating "new ticket" panel (`TicketDraftContext` + `FloatingTicketPanel`). Ticket shape (see `tickets` table below) already carries `assigned_vendor_name` (free-text, unused in UI today) and `source: 'ai'|'manual'`.
- Supabase `public` schema (via `list_tables`) has **no** amenity, vendor, attendance, or asset-cost tables at all — confirms report item 03 ("doesn't exist anywhere in the product, not even in the database").
- `tickets` table already has: `category`, `subcategory`, `priority`, `status`, `assigned_to_staff_id`, `assigned_vendor_name` (text, no FK), `resolved_at`. No cost field, no photo-on-resolution field (only `ticket_attachments` which today is populated at creation, not resolution — worth reusing rather than duplicating).
- `staff_users.role` check constraint is `ANY['admin','guard','finance','facility','worker']` — `facility` role already exists and is what gates `/facility/*` routes via `RequireAuth role="facility"`.
- Resident-facing auth: `residents.auth_user_id` / `portal_invited_at` / `portal_activated_at` columns already exist (Phase 0 work) — Phase 2's resident amenity-booking UI can assume a logged-in resident session by the time this ships.
- No `vendors`, `assets`, `staff_attendance`, `amenities` tables exist yet; all net-new.

---

## 3. Buildable spec

### 3.1 New tables (society-scoped, RLS following existing pattern: `society_id` FK + policy keyed off staff/resident JWT claims, matching how `tickets`/`visitors`/`notices` are already scoped)

```sql
-- Amenities the society offers for booking
create table amenities (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  name text not null,                     -- "Clubhouse", "Badminton Court", "Guest Room 1"
  booking_type text not null default 'slot' check (booking_type in ('slot', 'full_day')),
  requires_approval boolean not null default false,   -- instant-book vs admin must confirm
  fee_amount numeric not null default 0 check (fee_amount >= 0),  -- 0 = free
  capacity integer,                       -- null = unlimited (e.g. lawn); 1 = exclusive-use amenity
  slot_duration_minutes integer,          -- for booking_type='slot' only, e.g. 60
  open_time time,                         -- daily operating window
  close_time time,
  advance_booking_days integer not null default 7,   -- how far ahead residents can book
  cancellation_cutoff_hours integer not null default 2,
  active boolean not null default true,
  photo_imagekit_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Individual bookings
create table amenity_bookings (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  amenity_id uuid not null references amenities(id),
  resident_id uuid not null references residents(id),
  unit_id uuid not null references units(id),
  booking_date date not null,
  start_time time,                        -- null for full_day bookings
  end_time time,
  status text not null default 'confirmed'
    check (status in ('pending_approval', 'confirmed', 'cancelled', 'rejected', 'completed', 'no_show')),
  fee_amount numeric not null default 0,
  payment_status text not null default 'not_required'
    check (payment_status in ('not_required', 'pending', 'paid')),
  cancelled_at timestamptz,
  approved_by_staff_id uuid references staff_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Prevent double-booking a slot-based amenity for the same date+time range:
create unique index amenity_bookings_no_overlap
  on amenity_bookings (amenity_id, booking_date, start_time)
  where status in ('pending_approval', 'confirmed');

-- Vendors / AMC contracts
create table vendors (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  name text not null,
  category text,                          -- "Plumbing", "Elevator AMC", "Pest Control", "Electrical"
  phone text,
  contract_type text not null default 'ad_hoc' check (contract_type in ('ad_hoc', 'amc')),
  amc_start_date date,
  amc_end_date date,                      -- surfaced as "renewal due" when approaching
  amc_amount numeric,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Staff shift/attendance
create table staff_attendance (
  id uuid primary key default gen_random_uuid(),
  society_id uuid not null references societies(id),
  staff_id uuid not null references staff_users(id),
  shift_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status text not null default 'present' check (status in ('present', 'absent', 'half_day', 'leave')),
  marked_by_staff_id uuid references staff_users(id),   -- facility manager marking on staff's behalf
  created_at timestamptz not null default now(),
  unique (staff_id, shift_date)
);

-- Extend tickets for cost/vendor/asset history (report items 05/17)
alter table tickets
  add column vendor_id uuid references vendors(id),
  add column resolution_cost numeric check (resolution_cost >= 0),
  add column resolution_notes text;
-- resolution photos: reuse existing ticket_attachments table (already ticket_id-scoped),
-- add a `stage` column so creation-time and resolution-time photos are distinguishable:
alter table ticket_attachments
  add column stage text not null default 'created' check (stage in ('created', 'resolved'));

-- Low-confidence WhatsApp intake review (report item 06 — this repo's slice)
alter table tickets
  add column intake_confidence text check (intake_confidence in ('high', 'low')),
  add column resident_match_status text not null default 'matched'
    check (resident_match_status in ('matched', 'unmatched', 'ambiguous'));
-- 'unmatched' = resident_phone had no match in `residents`; 'ambiguous' = matched >1 candidate.
-- societyos-api already writes resident_name/resident_phone/unit_id on AI-created tickets;
-- this just gives the bot's output a place to flag "I wasn't sure" instead of silently
-- writing resident_name: null (which the UI currently renders as "Unknown resident" —
-- see TicketQueue.tsx line 265 — with zero way for an admin to fix it after the fact).
```

Every new table needs an RLS policy mirroring the existing `tickets`/`visitors` pattern (staff can read/write rows where `society_id` matches their `staff_users.society_id`; residents can read/write their own `amenity_bookings` rows via `resident_id = auth.uid()`-derived lookup through `residents.auth_user_id`, matching the Phase-0 resident-auth pattern already in the `residents` table).

### 3.2 Screens

**Resident amenity booking** (new resident-facing route, coordinate with Phase 0's resident portal shell):
- Amenity list (name, photo, fee, "book now"/"request booking" based on `requires_approval`)
- Calendar/slot picker per amenity, greyed-out unavailable slots, respects `advance_booking_days`
- "My bookings" list with cancel action (respects `cancellation_cutoff_hours`)
- Payment step reuses the existing Razorpay pattern from `payments`/`bill_cycles` if `fee_amount > 0` (same `razorpay_payment_link_id` flow, scoped to `amenity_bookings.id` instead of `dues.id` — needs a `payments.amenity_booking_id` nullable FK alongside the existing `due_id`, or a small `payment_target_type` discriminator column).

**Admin amenity setup** (`/admin/amenities`, add to `AdminLayout` nav array alongside existing entries):
- CRUD on `amenities` table (name, type, fee, capacity, hours, approval toggle, photo upload via existing ImageKit auth pattern used for resident/visitor photos)
- Calendar/list view across all amenities' bookings, approve/reject queue for `pending_approval` rows

**Facility manager dashboard** (rebuild `src/facility/FacilityLayout.tsx` nav from the current single "Ticket Queue" item into a real multi-page layout, mirroring `AdminLayout.tsx`'s nav-array pattern):
- `/facility` (index) — their own ticket queue, but scoped: filter `tickets` to ones assigned to this facility-manager's own team or unassigned+relevant category, rather than the full admin queue. Add cost/vendor/photo capture fields to the existing ticket resolution flow in `TicketQueue.tsx` (or a facility-specific variant) — vendor picker (from `vendors`), cost input, "resolved" photo upload reusing `ticket_attachments` with `stage='resolved'`.
- `/facility/vendors` — vendor list + AMC contract cards, renewal-due badge when `amc_end_date` is within e.g. 30 days, add/edit vendor form.
- `/facility/attendance` — staff_attendance grid (date columns x staff rows) scoped to `role='worker'` (and optionally `guard`) staff, check-in/out toggle or manual status marking, matches the "shift scheduling/attendance" gap in item 16.
- `/facility/staff` — read-only staff list (reuse `Staff.tsx`'s table but strip the add/edit/delete/deactivate actions and the `/api/staff` POST path — facility manager gets visibility, not management, addressing item 18 without duplicating admin's full CRUD).

**Admin intake review** (`/admin/tickets` filter or a new `/admin/intake-review` page):
- Filter/badge on tickets where `resident_match_status != 'matched'` — "Unmatched" or "Ambiguous" tickets surfaced separately from the normal queue (not buried in "Unknown resident" text as today)
- For `ambiguous`, show the candidate residents (same phone number or unit fuzzy-matched by the bot) so admin picks the right one and the ticket's `unit_id`/`resident_name` get corrected in one click
- For `unmatched`, a manual resident-link search (existing `ResidentRegistry` search pattern) to attach the ticket to the right resident/unit after the fact
- This doesn't fix the bot's matching logic (out of scope, lives in `societyos-api`) — it gives admins a recovery path when the bot gets it wrong, and gives `societyos-api` a place to write its confidence signal instead of dropping it.

---

## 4. Needs external credentials (stub only)

Nothing in this phase requires a new third-party account. Everything (amenity photos, resolution photos, AMC contract dates, attendance, payment for paid amenities) reuses infrastructure already wired into this repo:
- Photo uploads → existing ImageKit integration (`supabase/functions/imagekit-auth`), same pattern as resident/visitor photos.
- Paid amenity checkout → existing Razorpay integration (`societies.razorpay_key_id`, `payments` table pattern), same pattern as maintenance dues.

The one item to flag as **stub-only if it comes up during build**: some competitors (MyGate, ADDA) sync amenity bookings to residents' personal calendars (Google/Outlook) as a convenience feature. That's not in the report's must-have list and needs an OAuth calendar integration this repo doesn't have — if Agent 2/3 are tempted to add it, it should be stubbed (a disabled "Add to calendar" button or a `.ics` download link, which needs no external account) rather than a live OAuth flow.
