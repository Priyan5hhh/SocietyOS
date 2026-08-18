import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LinkTransition } from "@/components/ui/NavTransition"
import { AlertCircle } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/Button"
import { Input, Label, PasswordInput } from "@/components/ui/Input"
import { AuthHero } from "@/components/ui/AuthHero"
import { AuthChrome } from "@/components/ui/AuthChrome"
import { Logo } from "@/components/ui/Logo"

const heroPoints = [
  "One dashboard for billing, tickets and notices",
  "Guards log visitors from their phone at the gate",
  "Residents never install anything — it's all WhatsApp",
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(email, password)
      if (session.kind === "platform") navigate("/platform")
      else navigate(session.role === "admin" ? "/admin" : "/guard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="hidden bg-chrome-900 lg:block">
        <AuthHero
          imageSrc="https://ik.imagekit.io/3mwduebz8/marketing/society-building.jpg"
          imageAlt="Apartment building facade"
          points={heroPoints}
          tagline="NO APP · NO LOGIN · JUST WHATSAPP"
        />
      </div>
      <AuthChrome>
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <Logo size={20} />
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">SocietyOS</span>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink-900">Welcome back</h1>
            <p className="mt-1 text-sm text-ink-500">
              Sign in and we'll take you straight to your dashboard or the gate screen — whichever fits your account.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-4">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sunrise-residency.test"
            />
          </div>

          <div className="mb-6">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Continue"}
          </Button>

          <p className="mt-4 text-center text-sm text-ink-500">
            New society?{" "}
            <LinkTransition to="/signup" className="font-medium text-stamp-600 hover:underline">
              Sign up here
            </LinkTransition>
          </p>
        </form>
      </AuthChrome>
    </div>
  )
}
