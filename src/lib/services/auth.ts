/**
 * Auth service — talks to the real societyos-api backend (Supabase Auth
 * under the hood). The access token is the only thing kept in memory/
 * localStorage; the AI/Supabase keys never touch the frontend at all.
 */

export type Role = "admin" | "guard"

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

export type Session = StaffSession | PlatformSession

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
