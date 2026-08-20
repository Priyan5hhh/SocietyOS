# Phase 0 Research — Resident Identity (Foundation)

Author: Agent 1 (Researcher). Consumed by: Agent 2 (Builder).

Scope reminder: ship **one authenticated resident login per unit-resident**, nothing more. No KYC, no owner/tenant dispute resolution, no document verification, no self-service registration flow that bypasses staff. Those are explicitly Phase 1+ (governance). If a design choice below tempts scope creep, it says so.

---

## 1. How the incumbents do resident login today

### MyGate
- Residents are not self-signup from a blank slate — "owners and tenants can register themselves by sharing their details via their facility office" first, i.e. the facility office (admin/staff) is the source of truth that a phone number belongs to a given flat before the app will let someone in.
- Login is by email or phone; OTP is delivered to whichever identifier was used. Once the system validates the requester is an authorized resident of that flat, the registration is approved and the person can proceed.
- Family members are added by the primary registrant via an in-app "Add family" feature (multi-resident-per-unit is modeled as one primary registrant + dependents, not equal peer accounts).
- Admins get elevated access ("Admin Console") inside the same resident app, gated to the specific email/phone their admin role was created against — i.e. staff and resident identity share one login surface, differentiated by role, not two separate apps.
- Sources: [MyGate FAQs](https://mygate.com/faqs/), [Which admin roles can access the Admin Console](https://adminfaq.mygate.com/articles/130321-which-all-admin-roles-can-access-the-admin-console-section-on-resident-app)

### NoBrokerHood
- Resident signs up in-app with contact info + name + society details, then the request routes to the society's management committee/admin for approval before the account is live.
- OTP is delivered within seconds, expires in ~5 minutes.
- Admins approve new members/residents/staff directly from their own app; approval is commonly gated on the resident having uploaded ownership/tenancy documents.
- Sources: [10 Most Common Questions](https://www.nobrokerhood.com/blog/common-questions-asked-about-nobrokerhood/), [NoBrokerHood Admin App](https://www.nobrokerhood.com/nbh-admin-application/)

### ADDA
- Recommended login is phone number + OTP, explicitly marketed as password-free ("you don't need to remember your password and can simply log in using your phone number and OTP").
- New resident accounts show a "Waiting Approval" state until an admin confirms them (with a deliberate double-confirm step to avoid accidental approval) — self-registration still funnels through admin gatekeeping.
- Sources: [How do I login to ADDA?](https://support.adda.io/portal/en/kb/articles/how-do-i-login-to-adda), [ADDA app](https://stage3.adda.io/home/features-mobile-app.php)

### ApnaComplex (ANACITY)
- Registration is email/password + block/flat number; on submit, a verification link is emailed and, once clicked, an auto-generated approval request goes to the society admin. Login only unlocks after admin approval.
- OTP is used at login (delivered to email in ApnaComplex's case, not phone) as a second factor after the account exists.
- Unit linkage is explicit at registration time: the resident picks their society, then block, then flat number, and declares owner vs. resident-in-house.
- Sources: [How to log in to ApnaComplex & join your society](https://help.apnacomplex.com/knowledge-base/how-to-log-in-to-apnacomplex-app-join-your-society/), [How do I join my Apartment in ApnaComplex?](https://help.apnacomplex.com/knowledge-base/how-to-register-in-apnacomplex/)

### Pattern across all four
1. **Nobody lets a resident self-register into a live account unsupervised.** Every incumbent requires an admin-side approval or an admin-supplied invite before a phone/email becomes a working login. This validates SocietyOS's existing staff-mediated philosophy — it's not a gap to close, it's already the industry norm dressed up as "self-signup + approval queue."
2. **OTP-to-phone (or email) is the near-universal second factor**, not passwords. ADDA pushes phone+OTP as the *primary* and only recommended path.
3. **Unit linkage is a hard prerequisite for login to mean anything** — every flow ties the account to a specific block/flat before or during signup.
4. **Multi-resident-per-unit is handled as one primary account + added family members**, not N independent equal logins tied to the same unit. MyGate's "Add family" is the clearest example.
5. All four require a **native app install** — this is exactly the wedge SocietyOS's WhatsApp-first / no-forced-app positioning is meant to avoid, so Phase 0 should NOT copy "download our app" as part of the flow.

---

## 2. What SocietyOS should do differently

Given the WhatsApp-first ideology and the fact that admin-mediated onboarding is *already* the pattern this codebase uses for staff (see `src/admin/pages/Staff.tsx` — admin creates the account, shares credentials, no self-signup queue to review), Phase 0 should be the simplest version of the incumbents' converged pattern, with the admin-approval step collapsed away entirely because the source of truth already exists (admin already entered the resident's phone number in the Resident Registry to reach them on WhatsApp):

- **No approval queue.** The admin already added the resident (name, phone, unit) in `ResidentRegistry.tsx` to talk to them over WhatsApp. Phase 0 adds one action — "Invite to portal" — on an existing resident row. This flips a flag and that phone number becomes login-capable immediately. There is nothing left for an admin to "approve" that they didn't already vouch for by adding the resident in the first place. This is a deliberate simplification vs. every incumbent, and it's safe *because* SocietyOS never had unsupervised self-registration to begin with.
- **Phone + OTP as the only login method for residents** (no email/password for residents — that stays a staff/admin-only pattern, matching current `Login.tsx`). This reuses the exact number the household already talks to SocietyOS through on WhatsApp, so there's no new identifier to remember and it reinforces "no app, no password" positioning.
- **No native app, no app-store distribution.** This is a web login screen (mobile-web-first, PWA-installable later) reachable at a URL a resident can be sent over WhatsApp (e.g. a "Login" link in a WhatsApp message), not a Play Store / App Store listing. Nothing in this phase requires app packaging.
- **Multi-resident-per-unit stays 1 row = 1 login**, not "one primary + dependents." The Resident Registry already models a unit as having multiple resident rows (owner + tenant + members_count as a headcount, not named people) — Phase 0 gives each *resident row* its own optional login rather than inventing a primary/dependent hierarchy the schema doesn't have. Owner-vs-tenant precedence disputes are out of scope (deferred to governance phase per the brief).
- **Session persistence** should match the existing pattern exactly: a `Session` stored in `localStorage`, checked by `RequireAuth`-style guards, refreshed via `refresh_token` — no separate resident auth stack.
- **Login screen tone**: keep the existing hero copy pattern ("Residents never install anything — it's all WhatsApp") but now needs a *resident* variant of that same login page, not a rewrite — reuse `AuthHero`/`AuthChrome`/`Logo` components.

---

## 3. Concrete spec for this repo

### 3.0 How auth actually works here (read before building)

This frontend does **not** call Supabase directly. `src/lib/services/auth.ts` calls a REST backend at `VITE_API_BASE_URL` (`/api/auth/login`, `/api/auth/signup`) which wraps Supabase Auth server-side. There is no `supabase/migrations` folder and no Supabase client in `src/` (only `supabase/functions/imagekit-auth` exists, for ImageKit signing, unrelated to auth). **The Postgres schema and the `/api/*` backend live outside this repo** and are not available to Agent 2 to edit directly — Agent 2 should build the frontend to the API contract below and stub the network calls / mark backend routes as TODO-for-backend where a real backend isn't reachable, exactly as `Staff.tsx` and `ResidentRegistry.tsx` already do via `src/lib/services/api.ts`.

Existing pieces to reuse, not fork:
- `src/lib/services/auth.ts` — `Session` union type, `getSession()`, `signOut()`, `localStorage` key `societyos.session`.
- `src/lib/AuthContext.tsx` / `src/lib/auth-context.ts` — `useAuth()` hook, `login()`/`logout()`.
- `src/routes/RequireAuth.tsx` — `homePathFor(session)` role→path map, `RequireAuth`/`RequirePlatformAuth` guard components.
- `src/App.tsx` — route table where a new `/resident/*` route tree gets added.
- `src/admin/pages/Staff.tsx` — the "admin creates account, shows credentials once" UX pattern to mirror for "Invite to portal."
- `src/admin/pages/ResidentRegistry.tsx` — existing `Resident` interface/table; Phase 0 adds a portal-invite affordance here, it does not replace this page.

### 3.1 Data model additions

Since the DB lives in the external backend, this is the schema Agent 2 should assume/request the backend expose (and can mock in local stub responses). Extend the existing `residents` table rather than creating a parallel identity table:

```sql
-- Additive columns on the existing residents table
alter table residents
  add column auth_user_id uuid references auth.users(id) unique,  -- null until invited
  add column portal_invited_at timestamptz,
  add column portal_activated_at timestamptz;                      -- set on first successful OTP login

-- residents.phone already exists and is the OTP destination — no new phone column needed.
-- Uniqueness: one auth identity per resident ROW, not per phone number, because
-- members_count on a unit can mean multiple named residents share a unit but
-- Phase 0 only ever creates named resident rows one at a time (existing behavior).
```

RLS policies (resident-facing, additive — do not touch existing admin/staff policies):

```sql
-- Residents can read/update only their own resident row.
create policy resident_self_select on residents
  for select using (auth_user_id = auth.uid());

create policy resident_self_update on residents
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Residents can read their own unit (for display), never write it.
create policy resident_unit_select on units
  for select using (
    id in (select unit_id from residents where auth_user_id = auth.uid())
  );

-- Residents get read access to society-scoped resources they'll need in
-- LATER phases (notices, tickets) — do NOT add those policies in Phase 0,
-- they belong to the phase that ships those resident-facing features.
```

Do not add a `role` column expansion to the existing staff `Role` type (`admin | guard | finance | facility | worker`) — resident is a **separate session kind**, exactly like `platform` already is, not a sixth staff role. This keeps `RequireAuth role="..."` untouched.

### 3.2 Frontend session type (extend `src/lib/services/auth.ts`)

```ts
export interface ResidentSession {
  kind: "resident"
  resident_id: string
  unit_id: string
  society_id: string
  name: string
  phone: string
  access_token: string
  refresh_token: string
  expires_at: number
}

export type Session = StaffSession | PlatformSession | ResidentSession
```

Add alongside `signIn`:

```ts
export async function requestResidentOtp(phone: string): Promise<void> {
  // POST /api/auth/resident/otp/request { phone }
}

export async function verifyResidentOtp(phone: string, code: string): Promise<Session> {
  // POST /api/auth/resident/otp/verify { phone, code }
  // -> same LoginResponse shape as signIn(), stored under the same STORAGE_KEY
}
```

### 3.3 Routes and screens

- `src/routes/ResidentLogin.tsx` — two-step form (phone → OTP code), reusing `AuthHero`/`AuthChrome`/`Logo`, NOT the existing `Login.tsx` (that stays email/password for staff). Route: `/resident/login`.
- New guard in `RequireAuth.tsx`: `RequireResidentAuth` (same shape as `RequirePlatformAuth`, checks `session.kind === "resident"`).
- `homePathFor` gains a `resident` branch → `/resident`.
- `src/resident/ResidentHome.tsx` — minimal placeholder home ("You're logged in as {name}, {unit}" + a note that self-service features land in later phases). This is intentionally thin — Phase 0 is identity only, not features.
- `App.tsx` additions:
  ```tsx
  <Route path="/resident/login" element={<ResidentLogin />} />
  <Route element={<RequireResidentAuth />}>
    <Route path="/resident" element={<ResidentHome />} />
  </Route>
  ```

### 3.4 Admin-side change (`ResidentRegistry.tsx`)

Add an "Invite to portal" action per resident row (mirrors `Staff.tsx`'s create-and-reveal pattern but there's no password to reveal — instead show a success state: "Portal access enabled for {name}. They can now log in with {phone} at [link]"). This calls `POST /api/residents/:id/invite` and flips `portal_invited_at`. No new page needed — one button + one confirmation state in the existing modal/table is enough for Phase 0.

### 3.5 What NOT to build in Phase 0 (explicit scope fence)

- No resident self-registration / join-request flow (no incumbent lets this happen unsupervised either, per §1).
- No document upload / KYC / owner vs tenant proof.
- No "add family member" sub-accounts — one resident row, one optional login.
- No payments, bookings, tickets, or dues screens behind the resident login — `ResidentHome.tsx` is a placeholder landing page only.
- No native app / app store work.

---

## Needs external credentials (stub only)

Agent 2 should implement these behind a clearly-labeled, non-functional UI affordance rather than wiring them to a real provider. Each needs a human to obtain and supply a real credential later.

1. **SMS/OTP delivery provider** (e.g. Twilio Verify, MSG91, AWS SNS, or Supabase's built-in phone-auth SMS provider). Resident login is phone+OTP by design (§2), so this is the single hard external dependency for Phase 0 to actually work end-to-end. Until a provider key exists:
   - `requestResidentOtp()` / the "Send code" button should call the stub endpoint and the UI should show a visible placeholder state, e.g. a banner: *"SMS delivery not yet configured — enter any 6-digit code to continue in dev mode"* — do not silently fake success.
   - Backend route `/api/auth/resident/otp/request` and `/api/auth/resident/otp/verify` should be flagged for the backend owner as needing a real SMS provider credential (`TWILIO_*` / `MSG91_*` / Supabase phone auth provider config) before this leaves dev mode.
2. **WhatsApp Business API credentials** — out of scope for Phase 0 build work itself (WhatsApp messaging already exists as a product capability per the brief), but if Agent 2 adds a "we'll message you a login link on WhatsApp" affordance anywhere in the resident login screen, that message-send action must be stubbed the same way (visible placeholder, not a real send) since no WhatsApp Business API key is available in this environment.

Both should be tracked by the reporting agent as "needs human-supplied credential" items, not left as silent TODOs in code.
