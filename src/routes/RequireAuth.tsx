import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import type { Role } from "@/lib/services/auth"

const rolePath: Record<Role, string> = {
  admin: "/admin",
  guard: "/guard",
  finance: "/finance",
  facility: "/facility",
  // Workers are notify-only (no dedicated portal by design) — send them to
  // a short explainer instead of looping them back through /login.
  worker: "/worker",
}

export function homePathFor(session: NonNullable<ReturnType<typeof useAuth>["session"]>) {
  if (session.kind === "platform") return "/platform"
  if (session.kind === "resident") return "/resident"
  return rolePath[session.role]
}

export function RequireAuth({ role }: { role: Role }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.kind !== "staff" || session.role !== role) return <Navigate to={homePathFor(session)} replace />
  return <Outlet />
}

export function RequirePlatformAuth() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.kind !== "platform") return <Navigate to={homePathFor(session)} replace />
  return <Outlet />
}

export function RequireResidentAuth() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/resident/login" replace />
  if (session.kind !== "resident") return <Navigate to={homePathFor(session)} replace />
  return <Outlet />
}
