import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import type { Role } from "@/lib/services/auth"

export function homePathFor(session: NonNullable<ReturnType<typeof useAuth>["session"]>) {
  if (session.kind === "platform") return "/platform"
  return session.role === "admin" ? "/admin" : "/guard"
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
