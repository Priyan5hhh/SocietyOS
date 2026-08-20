# Phase 1 Research — Close the Billing Loop

Scope: resident self-service payment (01), offline payment reconciliation (02), dues history & receipts (14) — one user flow, not three features. Phase 0 (resident login) is assumed to land first: a `ResidentSession`, `RequireResidentAuth` guard, and resident routes exist by the time this builds (not yet present in this snapshot of the repo).

## 1. Competitor patterns

**MyGate**
- Resident pays via UPI/card/net banking inside the app; gets an instant e-receipt and can download payment history.
- Offline payments (cash/cheque/POS/bank transfer received outside the app) go through a distinct "**payment intimation**" flow: the resident (or admin) flags that a due was paid outside the app. Admin verifies the amount against the society's bank statement, then clicks "**Confirm and Settle**," which opens a **Receipt Generation** page to create the receipt manually. A separate "Mark as settled" action exists for when money is already in the bank and a receipt was already generated for that payment. Receipts appear in a "**Receipt Register**" listing all receipts (online + offline) by type.
- Receipt date must be the same as or after the actual payment date (backdating guard).
Sources: [MyGate — How to create a receipt for offline payments](https://adminfaq.mygate.com/articles/124781-how-to-create-a-receipt-for-offline-payments-payment-done-outside-mygate), [MyGate — What is payment intimation?](https://adminfaq.mygate.com/articles/129579-what-is-payment-intimation), [MyGate — Receipt Register](https://adminfaq.mygate.com/articles/131203-what-is-a-receipt-register-and-what-types-of-receipts-are-included-in-it), [MyGate — Dues & Receipts](https://adminfaq.mygate.com/categories/30234-dues-receipts)

**ADDA**
- Full accounting suite: Bank & Petty Cash Manager, General Ledger, Flat Account Statements. Offline payment methods explicitly supported: cheque, cash, bank transfer (NEFT/IMPS/RTGS), demand draft.
- Resident-side "**Already Paid**" declaration lets a resident notify the association that a due was settled outside ADDA (cheque/ACH/wire/direct deposit) — mirrors MyGate's intimation pattern, then admin reconciles against the ledger.
Sources: [ADDA — Society Billing Software](https://adda.io/blog/2025/01/best-society-billing-software/), [ADDA — apartment accounting](https://apartmentadda.com/home/housing-society-management-accounting.php)

**ApnaComplex**
- "Collection Gateway" automates NEFT reconciliation of dues paid by bank transfer, reducing manual matching.
- Resident app: Payments → Quick Action shows outstanding dues with a "Pay Now" button per due; PDF e-receipts sent instantly on successful online payment; residents can view/download invoices and receipts and see account statements (dues history) on demand.
Sources: [ApnaComplex — Collection Gateway](https://www.apnacomplex.com/collection-gateway), [ApnaComplex — Society Billing Software](https://www.apnacomplex.com/society-billing-software), [ApnaComplex — How to make payments](https://help.apnacomplex.com/knowledge-base/how-to-make-payments-on-apnacomplex-app/), [ApnaComplex — download invoice/receipts](https://help.apnacomplex.com/knowledge-base/how-to-download-invoice-and-receipts-on-apnacomplex-app/)

**NoBrokerHood**
- Integrated payment options for maintenance/services with accounting features; public detail on offline-reconciliation UX is thinner than the other three, but the category convention (online pay + admin-side manual settlement + receipt) is consistent across all four competitors.
Source: [Techjockey — ADDA vs MyGate vs NoBrokerHood](https://www.techjockey.com/compare/adda-erp-vs-mygate-security-management-vs-nobrokerhood)

**Common pattern across all four** (this is what SocietyOS should copy): (a) online pay produces an instant system-generated receipt tied 1:1 to a due; (b) offline payment is a distinct, admin-mediated "reconcile" action — never auto-marked paid — that also produces a receipt, with an optional resident-initiated "I already paid" nudge; (c) a persistent receipt/dues-history ledger per unit/resident that both admin and resident can view and download.

## 2. Current data model (read via Supabase MCP + `src/admin/pages/Billing.tsx`)

Existing tables relevant to billing:
- `societies` — has `razorpay_key_id` (nullable) already reserved for gateway integration.
- `society_configs` — `billing_cycle_day`, `currency`, `default_amount_per_unit`.
- `bill_cycles` (id, society_id, label, period_start/end, due_date, amount_per_unit, status: draft/generated/closed).
- `dues` (id, society_id, bill_cycle_id, unit_id, resident_id nullable, amount, **status: paid/due/overdue**, due_date, `paid_at` nullable). One row per unit per cycle.
- `payments` — **already exists but empty (0 rows) and is gateway-only**: `due_id` FK, `razorpay_payment_link_id/order_id/payment_id/signature`, `amount`, `currency`, `status` (created/authorized/captured/failed/refunded), `raw_webhook_payload`. **No `method` column, no cash/UPI/cheque support, no `recorded_by`, no `reference`, no `receipt_number`.** This table is the online-only half of the loop.
- `payment_webhook_events` — Razorpay webhook audit log (provider, event_id, payload, signature_verified).
- `reminders` — generic reminder queue keyed on `target_type: due|ticket` — the existing `Billing.tsx` UI already uses this for "Remind" / "Send bill" per due. Useful precedent for how to wire new resident-facing/admin-facing actions into the same `api.post`/`useCachedFetch` patterns.

`src/admin/pages/Billing.tsx` today: admin creates bill cycles and views dues per cycle with paid/due/overdue stamps and reminder buttons. **No "mark paid," no offline entry, no receipt, no resident view at all.** This confirms the report's claim: arrears are permanently wrong because nothing can ever transition a due to `paid` except a Razorpay webhook that doesn't exist yet in practice (0 rows in `payments`).

Backend note: API routes (`/api/billing/*`) are served by a separate `societyos-api` backend not present in this repo — `src/lib/services/api.ts` is a thin fetch wrapper with bearer-token auth. New endpoints below are specified as contracts this frontend will call; implementation lives in that backend.

## 3. Buildable spec

### 3a. Schema changes

Extend `payments` (keep it as the single source of truth for "money against a due," online or offline) rather than creating a parallel table:

```sql
alter table public.payments
  add column method text not null default 'razorpay'
    check (method in ('razorpay', 'cash', 'upi', 'cheque', 'bank_transfer', 'other')),
  add column recorded_by_staff_id uuid references public.staff_users(id),
  add column reference_note text,          -- cheque no. / UPI txn id / bank ref, free text
  add column receipt_number text unique,   -- e.g. RCPT-2026-000123, generated on settle
  add column receipt_issued_at timestamptz,
  add column settled_at timestamptz;       -- when admin confirmed offline receipt (mirrors MyGate "Confirm and Settle")
```

Rationale: `razorpay_*` columns stay nullable/unused for offline rows; `status` (`created/authorized/captured/failed/refunded`) still fits — offline entries get inserted directly as `status = 'captured'` at creation since there's no async webhook step. `recorded_by_staff_id` gives the audit trail the offline flow needs (who reconciled it); pair with the existing generic `audit_log` table (action `payment.reconciled`, entity_type `payment`).

A due should only ever have one *effective* captured payment; enforce with a partial unique index: `create unique index payments_one_captured_per_due on public.payments(due_id) where status = 'captured';` — prevents double-marking a due paid.

When a `payments` row transitions to `status = 'captured'` (whether online webhook or offline reconcile), a DB trigger or the same request handler sets `dues.status = 'paid'` and `dues.paid_at = now()` — this is the actual fix for arrears correctness and should be one transaction, not two separate writes from two separate pages.

RLS: `payments` already has RLS enabled; extend policies so residents can `select` only rows where `due_id` belongs to a due tied to their own `unit_id`/`resident_id` (via join), and can never `insert`/`update` directly (creation only through the backend service role, whether for a gateway callback or an admin reconcile action).

### 3b. Admin UI — offline reconciliation (build for real)

New section/modal on `src/admin/pages/Billing.tsx`, per due row in the Dues table:
- Action "**Mark paid (offline)**" opens a modal: method select (Cash / UPI / Cheque / Bank transfer / Other), amount (prefilled from due, editable for partial/rounding), reference note (cheque no. / UTR / UPI ref — free text, required for non-cash), date received (defaults today, cannot be future).
- Submit calls `POST /api/billing/dues/:id/reconcile` → backend inserts into `payments` (method, amount, reference_note, recorded_by_staff_id = current staff, status='captured', settled_at=now()), generates `receipt_number` (sequential per society, e.g. `{society_slug}-{year}-{seq}`), flips `dues.status='paid'`, writes `audit_log`.
- Table row status stamp updates to `paid`; add a small receipt icon/link next to paid dues opening a printable receipt view (`/api/billing/payments/:id/receipt` → simple HTML/PDF with society name, unit, amount, method, reference, receipt number, date — no external service needed, can be server-rendered HTML->print).
- Bulk import path (stretch, not required for MVP): CSV upload of bank statement lines for NEFT-style reconciliation matching ApnaComplex's Collection Gateway idea — explicitly out of scope for Phase 1, note as Phase 2 candidate.

### 3c. Resident UI — "My Dues" (new resident routes, gated by `RequireResidentAuth`)

New page e.g. `src/resident/pages/Dues.tsx` (mirrors the Phase-0 resident route namespace):
- **Dues list**: current + past dues for the logged-in resident's unit, pulled via `GET /api/resident/dues` (status stamp reused from admin: paid/due/overdue, amount, due date, cycle label).
- **Pay Now button** per unpaid due: opens a modal that is a *complete UI flow stubbed only at the final charge step*:
  - Step 1: confirm amount + due.
  - Step 2: "Choose payment method" — UPI / Card / Net banking tiles rendered but disabled, or a single primary CTA that on click shows a clearly labeled stub state: *"Online payments are launching soon. To pay now, use UPI/bank transfer to [society bank details] and we'll confirm within 24 hours — or tap 'I already paid' below."* This satisfies "full UI/UX flow, stubbed at the payment step."
  - "**I already paid**" secondary action (the MyGate/ADDA "payment intimation" pattern): resident submits method + reference note + amount, creates a `payments` row with `status='created'` (not yet captured) flagged for admin review, and surfaces in a new "Pending resident intimations" list on the admin Billing page for the admin to verify and run through the same reconcile action as 3b (turns intimation into settlement, one click since fields are prefilled).
- **Receipts / history tab**: list of all `payments` rows (online + offline) for the resident's unit with method, date, amount, receipt number, and a "View receipt" link reusing the same receipt render endpoint as 3b.

### 3d. Endpoint summary (backend contract, implemented outside this repo)

- `GET /api/billing/dues` (admin, existing) — no change needed besides response also including latest `payments.receipt_number` per paid due.
- `POST /api/billing/dues/:id/reconcile` (admin, new) — offline mark-paid, described in 3b.
- `POST /api/billing/dues/:id/pay` (resident, new, **stub**) — would create a Razorpay order; for Phase 1 this returns a `501`/`not_implemented` style response or a canned "gateway pending" payload so the frontend can render the stub state without a real backend integration existing yet.
- `POST /api/billing/dues/:id/intimate` (resident, new) — "I already paid," described in 3c.
- `GET /api/resident/dues` (resident, new) — resident's own dues, scoped by `RequireResidentAuth` session's unit.
- `GET /api/billing/payments/:id/receipt` (admin + resident, new) — receipt render/download, works for both online and offline payments identically.

## Needs external credentials (stub only)

These require the business owner's bank account, PAN, and KYC documents for RBI payment-aggregator onboarding (Razorpay/Cashfree) — cannot be completed by an agent, and must ship as a clearly-labeled disabled/coming-soon state:
- Actual online charge capture (UPI/card/net-banking processing) via Razorpay (or equivalent). The `razorpay_key_id` column on `societies` and the `payments.razorpay_*` columns already reserve the shape for this; only the live account/API keys and the checkout SDK wiring are missing.
- Razorpay webhook signature verification against a real webhook secret (`payment_webhook_events` table already exists and is ready to receive real events once an account exists).
- Any SMS/payment-gateway-hosted checkout page redirect.

Everything else in this spec needs **no external account** and should be built for real in Phase 1:
- `payments` schema extension (method/recorded_by/reference/receipt_number/settled_at) and the unique-captured-payment guard.
- Admin offline reconciliation UI and endpoint (3b) — this is the actual fix for "every arrears report is wrong."
- Resident "My Dues" + dues/receipt history view (3c, minus the live charge step).
- "I already paid" resident intimation flow and its admin review queue.
- Receipt generation/render endpoint (pure server-side templating, no external service).
- Audit logging of who reconciled what (`audit_log`, already exists).
