import { createContext, useContext } from "react"
import type { Session } from "@/lib/services/auth"

export interface AuthContextValue {
  session: Session | null
  login: (email: string, password: string) => Promise<Session>
  logout: () => void
  setSession: (session: Session) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
