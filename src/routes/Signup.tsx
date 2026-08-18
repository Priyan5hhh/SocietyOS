import { useState } from "react"
import { LinkTransition } from "@/components/ui/NavTransition"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input, Label, PasswordInput } from "@/components/ui/Input"
import { AuthHero } from "@/components/ui/AuthHero"
import { AuthChrome } from "@/components/ui/AuthChrome"
import { Logo } from "@/components/ui/Logo"

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined

const heroPoints = [
  "A platform admin reviews every new society by hand",
  "You'll be notified the moment yours is approved",
  "Then sign in and set up billing, notices and staff",
]

export default function Signup() {
  const [societyName, setSocietyName] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ society_name: societyName, name, email, password }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error((body && typeof body === "object" && "error" in body ? String(body.error) : null) ?? "Signup failed")
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden bg-chrome-900 lg:block">
        <AuthHero
          imageSrc="https://ik.imagekit.io/3mwduebz8/marketing/ledger-desk.jpg"
          imageAlt="An open ledger notebook and clipboard on a desk"
          points={heroPoints}
          tagline="ONE REGISTER PER SOCIETY"
        />
      </div>

      <AuthChrome>
        {done ? (
          <div className="w-full max-w-sm text-center">
            <CheckCircle2 size={40} className="mx-auto text-stamp-600" />
            <h1 className="mt-4 font-serif text-2xl font-semibold text-ink-900">Request sent</h1>
            <p className="mt-2 text-sm text-ink-500">
              Your society signup is pending approval. You'll be able to sign in once it's approved.
            </p>
            <LinkTransition to="/login" className="mt-6 inline-block text-sm font-medium text-stamp-600 hover:underline">
              Back to sign in
            </LinkTransition>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-1 flex items-center gap-2">
                <Logo size={20} />
                <span className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">SocietyOS</span>
              </div>
              <h1 className="font-serif text-2xl font-semibold text-ink-900">Sign up your society</h1>
              <p className="mt-1 text-sm text-ink-500">
                A few details to get your society's register started — a platform admin reviews it before it goes live.
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="mb-4">
              <Label htmlFor="society-name">Society name</Label>
              <Input
                id="society-name"
                required
                value={societyName}
                onChange={(e) => setSocietyName(e.target.value)}
                placeholder="e.g. Sunrise Residency"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priya Nair" />
            </div>

            <div className="mb-4">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Submitting…" : "Request access"}
            </Button>

            <p className="mt-4 text-center text-sm text-ink-500">
              Already approved?{" "}
              <LinkTransition to="/login" className="font-medium text-stamp-600 hover:underline">
                Sign in
              </LinkTransition>
            </p>
          </form>
        )}
      </AuthChrome>
    </div>
  )
}
