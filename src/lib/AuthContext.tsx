import { useState, type ReactNode } from "react"
import { getSession, signIn, signOut, type Session } from "@/lib/services/auth"
import { AuthContext } from "@/lib/auth-context"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => getSession())

  async function login(email: string, password: string) {
    const s = await signIn(email, password)
    setSession(s)
    return s
  }

  function logout() {
    signOut()
    setSession(null)
  }

  return <AuthContext.Provider value={{ session, login, logout, setSession }}>{children}</AuthContext.Provider>
}
