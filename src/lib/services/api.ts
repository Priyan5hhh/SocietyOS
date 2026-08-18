/**
 * Thin fetch wrapper for the societyos-api backend. Attaches the stored
 * access token, handles JSON, and centralizes error shape so every page
 * gets the same { error } handling instead of each reimplementing it.
 */
import { getSession, signOut } from "@/lib/services/auth"

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new ApiError(0, "VITE_API_BASE_URL is not set")

  const session = getSession()
  const headers = new Headers(init?.headers)
  headers.set("Content-Type", "application/json")
  if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`)

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const message = (body && typeof body === "object" && "error" in body ? String(body.error) : null) ?? res.statusText
    // A 401 here means the stored session is gone/expired/invalid server-side
    // (e.g. a stale token from a previous browser session). Clear it and
    // send the user back to sign in, rather than leaving every page stuck
    // silently failing with "missing bearer token"-style errors forever.
    if (res.status === 401) {
      signOut()
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login")
      }
    }
    throw new ApiError(res.status, message)
  }

  return body as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data !== undefined ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data !== undefined ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
}
