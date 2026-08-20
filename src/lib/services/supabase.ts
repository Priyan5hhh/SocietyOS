/**
 * Direct Supabase client — used sparingly, for the handful of features that
 * write straight to Supabase from the frontend instead of going through the
 * societyos-api backend (see Phase 1 billing: offline reconciliation,
 * resident "My Dues" / "I already paid"). Most of the app still goes through
 * `src/lib/services/api.ts`; this exists because those billing routes don't
 * exist on that backend yet and the underlying tables/RLS/RPCs already
 * support doing this safely for real.
 *
 * Two flavors:
 *  - `supabaseAnon` — plain anon-key client, no auth header. Used for the
 *    resident-facing RPCs (`resident_get_dues`, `resident_intimate_payment`,
 *    etc.), which are SECURITY DEFINER functions scoped by the ids the
 *    resident session already carries, not by a Supabase Auth JWT — because
 *    resident login is still the Phase 0 dev-mode OTP stub (see
 *    docs/pipeline/NEEDS_YOUR_INPUT.md) and does not mint a real Supabase
 *    session. Sending the fake dev-mode token as a bearer token would just
 *    get every request rejected as an invalid JWT, so we deliberately don't.
 *  - `getStaffSupabase()` — builds a client carrying the *real* Supabase JWT
 *    issued to staff/admin at sign-in (societyos-api's login route uses
 *    Supabase Auth under the hood, so `StaffSession.access_token` is a real,
 *    signed token with `app_metadata.role`/`app_metadata.society_id`).
 *    RLS policies and the `reconcile_offline_payment`/`settle_pending_payment`
 *    RPCs key off that JWT, so admin/finance writes are genuinely
 *    permission-checked server-side, not just hidden in the UI.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { getSession } from "@/lib/services/auth"

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set")
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY }
}

let _anon: SupabaseClient | null = null

/** Plain anon-key client — no session, no bearer token. See file header. */
export function supabaseAnon(): SupabaseClient {
  if (_anon) return _anon
  const { url, key } = requireConfig()
  _anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _anon
}

/**
 * Client carrying the current staff session's real Supabase JWT as a bearer
 * token, so RLS (`auth.jwt() -> app_metadata`) and the reconcile/settle RPCs
 * see the actual signed-in admin/finance user. Throws if there's no staff
 * session — callers should only reach this from admin-gated pages.
 */
export function getStaffSupabase(): SupabaseClient {
  const { url, key } = requireConfig()
  const session = getSession()
  if (!session || session.kind !== "staff") {
    throw new Error("No staff session — sign in as admin/finance to do this.")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
}

/**
 * Decodes the current staff session's Supabase JWT locally (no network
 * round trip) to read `sub` (the staff_users.id RLS/audit rows expect) and
 * `app_metadata.society_id`. Used by Phase 2 screens that need to stamp
 * `society_id`/`marked_by_staff_id` on inserts — the JWT is already trusted
 * (it's what RLS itself checks), so decoding it client-side for display/
 * payload purposes is safe; it is never used as an auth check.
 */
export function getStaffClaims(): { staffId: string | null; societyId: string | null } {
  const session = getSession()
  if (!session || session.kind !== "staff") return { staffId: null, societyId: null }
  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return {
      staffId: typeof payload.sub === "string" ? payload.sub : null,
      societyId: payload.app_metadata?.society_id ?? null,
    }
  } catch {
    return { staffId: null, societyId: null }
  }
}
