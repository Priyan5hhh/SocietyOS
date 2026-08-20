# SocietyOS Build Pipeline — Final Report

Maintained by Agent 4 (Reporter). All 5 phases from the product strategy report have
completed Research → Build → Test. See `docs/pipeline/NEEDS_YOUR_INPUT.md` for the full,
itemized list of stubbed buttons/integrations awaiting real credentials or decisions — this
report is the narrative summary; that file is the checklist.

## Status: all phases shipped

| Phase | Research | Build | Test |
|-------|----------|-------|------|
| 0 — Foundation (resident identity) | done | done | done — clean |
| 1 — Close the billing loop | done | done | done — clean |
| 2 — Core competitive parity | done | done | done — 2 real bugs found & fixed |
| 3 — Trust, governance & revenue depth | done | done | done — 1 real bug found & fixed |
| 4 — Polish, differentiation & reach | done | done | done — clean, safety-audited |

## What actually shipped, by phase

**Phase 0 — Resident identity.** Phone+OTP login (dev-mode: code shown on-screen, no SMS
provider connected yet), `ResidentSession`/`RequireResidentAuth`, admin "Invite to portal"
action, minimal resident home. This unblocks every resident-facing screen built in Phases 1–4.

**Phase 1 — Billing loop.** Admin can mark a bill paid offline (cash/UPI/cheque) with a
receipt number — real, working, and the direct fix for the report's #1 finding that arrears
data was wrong by design. Resident "My Dues," a clearly-stubbed "Pay Now," a real "I already
paid" intimation flow, and receipt history.

**Phase 2 — Competitive parity.** Amenity booking (resident + admin), a real facility-manager
portal (own ticket queue, vendor CRUD, attendance, read-only staff list — replacing the old
relabeled ticket list), and an admin intake-review screen for unmatched WhatsApp tickets.

**Phase 3 — Trust, governance & revenue depth.** Guest pre-approval, a security-signal review
screen (same-visitor-multiple-units detection), a real ledger + sequential GST invoicing +
Tally CSV export, defaulter export, an audit log screen, a document vault, and a real
one-vote-per-unit elections flow. Subscription page now does real plan changes; only the
payment-method update is stubbed.

**Phase 4 — Polish & reach.** An "Alert security desk" button (never labeled SOS/emergency —
this was treated as a safety requirement, not a style choice, and was independently audited
by the tester), a guard/admin active-alerts screen, notice read-receipt stats, and PWA
installability extended to the resident portal.

## Real bugs the pipeline caught and fixed on its own

- **Phase 2:** every amenity slot-booking attempt was silently failing — an invalid Postgres
  `'infinity'::time` cast in the overlap check. Fixed. Also found and fixed a systemic bug
  where Supabase errors were being swallowed app-wide (`err instanceof Error` is always false
  for Supabase's error shape) — fixed in the 7 files this phase touched, and flagged the same
  pattern in ~24 other files as a separate follow-up (you'll see it as a suggested task, not
  auto-applied, since it touches code outside this phase's scope).
- **Phase 3:** late fees and GST invoicing were permanently no-ops for every society — the
  settings that drive them (`late_fee_rate_annual_pct`, `grace_days`, `gstin`) had no UI
  anywhere to set them. Added a settings form to the Billing page; verified the interest math
  end-to-end.

## One thing worth your attention (not a bug, a scope note)

Every resident-facing Supabase RPC across all 5 phases (dues, amenities, pre-approvals,
documents, elections, SOS alerts) is scoped by the *unit/resident id the frontend sends*, not
by a cryptographically verified session — because Phase 0's OTP login is still dev-mode (no
real SMS provider, no real Supabase JWT for residents). This is documented per-phase in
`NEEDS_YOUR_INPUT.md` and the blast radius was explicitly checked at each phase (contained to
that resident's own society's data, nothing admin-only or cross-tenant) — but it is not
production-safe until a real SMS/OTP provider is wired up. That single fix (Phase 0's top row
in `NEEDS_YOUR_INPUT.md`) is the one item that unlocks tightening every other phase's RLS at
once — treat it as the first thing to resolve before any real resident uses this.

## Open items

- **Pricing page:** you asked to remove the "contact us" gate on the marketing FAQ. Still
  waiting on real numbers from you (price per unit/month, whether it varies by society size)
  — not built yet, since guessing a number would be worse than the current honest answer.
- **Phase 3 scope cut:** gate-arrival push notification for un-pre-approved walk-in guests
  wasn't built (breadth over depth was prioritized across Phase 3's 7 items) — noted in
  `NEEDS_YOUR_INPUT.md` row 19, not a credential gap, just unbuilt.
- **Payment gateway (Razorpay/Cashfree):** the one dependency threading through Phases 1, 2,
  and 3 (Pay Now, amenity paid bookings, subscription payment method, late-fee auto-charge) —
  needs your society's bank details, PAN, and KYC docs, which no agent can obtain. Everything
  else is built and ready to wire in the moment you have live keys.
