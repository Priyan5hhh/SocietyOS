/**
 * Auth service — talks to the real societyos-api backend (Supabase Auth
 * under the hood). The access token is the only thing kept in memory/
 * localStorage; the AI/Supabase keys never touch the frontend at all.
 */

import { supabaseAnon } from "@/lib/services/supabase"

export type Role = "admin" | "guard" | "finance" | "facility" | "worker"

export interface StaffSession {
  kind: "staff"
  role: Role
  name: string
  society_id: string
  access_token: string
  refresh_token: string
  expires_at: number
}

export interface PlatformSession {
  kind: "platform"
  access_token: string
  refresh_token: string
  expires_at: number
}

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

const STORAGE_KEY = "societyos.session"
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

export function getSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Session) : null
}

interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  user: { id: string; role?: Role; society_id?: string; name?: string; platform_admin?: boolean }
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (!BASE_URL) throw new Error("VITE_API_BASE_URL is not set")

  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((body && typeof body === "object" && "error" in body ? String(body.error) : null) ?? "Sign in failed")
  }

  const data = body as LoginResponse
  const session: Session = data.user.platform_admin
    ? {
        kind: "platform",
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }
    : {
        kind: "staff",
        role: data.user.role as Role,
        name: data.user.name ?? "",
        society_id: data.user.society_id as string,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
      }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function signOut() {
  localStorage.removeItem(STORAGE_KEY)
}

interface ResidentOtpVerifyResponse {
  access_token: string
  refresh_token: string
  expires_at: number
  resident: { id: string; unit_id: string; society_id: string; name: string; phone: string }
}

/**
 * DEV MODE STUB — SMS/OTP delivery provider not configured.
 *
 * The societyos-api backend does not yet implement
 * POST /api/auth/resident/otp/request (needs a real SMS provider —
 * Twilio Verify / MSG91 / Supabase phone auth — see
 * docs/pipeline/NEEDS_YOUR_INPUT.md). Rather than silently pretending an
 * SMS was sent, this generates the code locally, stores it for
 * verifyResidentOtp() to check, and returns it so the UI can surface it in
 * a visible "DEV MODE" banner. Swap this for a real `fetch` to the backend
 * route once that route exists.
 */
export async function requestResidentOtp(phone: string): Promise<{ devOtp: string }> {
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  sessionStorage.setItem(`societyos.resident_otp.${phone}`, code)
  return { devOtp: code }
}

/**
 * DEV MODE STUB — pairs with requestResidentOtp() above. Verifies against
 * the locally-stored dev code (not a real backend/SMS-provider round trip).
 * There is no backend route yet to resolve "which resident owns this phone
 * number" into real unit/society ids (see docs/pipeline/NEEDS_YOUR_INPUT.md),
 * so as a best-effort stand-in this looks the phone number up directly
 * against the `residents` table via the `lookup_resident_by_phone` Supabase
 * RPC. If a match exists the session carries real resident/unit/society ids
 * (so Phase 1's "My Dues" etc. can query real data); if not, it falls back
 * to placeholder ids and those screens will simply show no dues. Replace
 * this whole function with a real call to POST /api/auth/resident/otp/verify
 * once that backend route exists.
 */
export async function verifyResidentOtp(phone: string, code: string): Promise<Session> {
  const key = `societyos.resident_otp.${phone}`
  const stored = sessionStorage.getItem(key)
  if (!stored || stored !== code) {
    throw new Error("Incorrect code. Check the DEV MODE banner for the current code.")
  }
  sessionStorage.removeItem(key)

  let resident = { id: "dev-resident", unit_id: "dev-unit", society_id: "dev-society", name: "Resident", phone }
  try {
    const { data } = await supabaseAnon().rpc("lookup_resident_by_phone", { p_phone: phone })
    const match = Array.isArray(data) ? data[0] : null
    if (match) {
      resident = { id: match.id, unit_id: match.unit_id, society_id: match.society_id, name: match.name, phone: match.phone }
    }
  } catch {
    // Supabase not configured or lookup failed — keep placeholder ids so
    // login still succeeds (Phase 0 behavior), just without real dues data.
  }

  const data: ResidentOtpVerifyResponse = {
    access_token: "dev-mode-token",
    refresh_token: "dev-mode-refresh",
    expires_at: Date.now() + 60 * 60 * 1000,
    resident,
  }

  const session: ResidentSession = {
    kind: "resident",
    resident_id: data.resident.id,
    unit_id: data.resident.unit_id,
    society_id: data.resident.society_id,
    name: data.resident.name,
    phone: data.resident.phone,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}
