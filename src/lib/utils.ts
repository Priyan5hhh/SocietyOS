import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extracts a human-readable message from a caught error, with a fallback.
 *
 * `err instanceof Error` alone isn't enough here: supabase-js's `.rpc()` /
 * `.from()` calls resolve `{ data, error }` rather than throwing, and the
 * `error` they hand back is the *raw parsed JSON body* of the PostgREST
 * error response (`{ code, details, hint, message }`) — a plain object, not
 * a `PostgrestError` instance — unless the query was built with
 * `.throwOnError()`. Call sites across this app do `if (err) throw err`
 * with that plain object, so `err instanceof Error` is always false for
 * Supabase errors and silently swallows the real message (e.g. a friendly
 * `RAISE EXCEPTION` string from an RPC) behind a generic fallback. This
 * checks for a string `message` field first so those come through, then
 * falls back to `Error.message`, then to the caller's fallback text.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string" && err.message) {
    return err.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

export function formatTimeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
