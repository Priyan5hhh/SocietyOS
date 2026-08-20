import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LinkTransition } from "@/components/ui/NavTransition"
import { AlertCircle, FlaskConical } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { homePathFor } from "@/routes/RequireAuth"
import { requestResidentOtp, verifyResidentOtp } from "@/lib/services/auth"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { AuthHero } from "@/components/ui/AuthHero"
import { AuthChrome } from "@/components/ui/AuthChrome"
import { Logo } from "@/components/ui/Logo"
import { errorMessage } from "@/lib/utils"

const heroPoints = [
  "One dashboard for billing, tickets and notices",
  "Guards log visitors from their phone at the gate",
  "Residents never install anything — it's all WhatsApp",
]

export default function ResidentLogin() {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<"phone" | "otp">("phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { devOtp } = await requestResidentOtp(phone)
      setDevOtp(devOtp)
      setStep("otp")
    } catch (err) {
      setError(errorMessage(err, "Couldn't send a code — try again"))
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await verifyResidentOtp(phone, code)
      setSession(session)
      navigate(homePathFor(session))
    } catch (err) {
      setError(errorMessage(err, "Verification failed"))
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
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <div className="mb-1 flex items-center gap-2">
              <Logo size={20} />
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">SocietyOS</span>
            </div>
            <h1 className="font-serif text-2xl font-semibold text-ink-900">Resident login</h1>
            <p className="mt-1 text-sm text-ink-500">
              {step === "phone"
                ? "Enter the phone number your society has on file for you — we'll text you a code."
                : `Enter the code sent to ${phone}.`}
            </p>
          </div>

          <div className="mb-5 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <FlaskConical size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold uppercase tracking-wide text-xs">Dev mode</p>
              <p>
                SMS delivery isn't configured yet, so codes aren't actually texted. Once you request a code it will
                appear right here.
              </p>
              {devOtp && (
                <p className="mt-1.5 font-mono text-base tracking-widest text-amber-900">{devOtp}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {step === "phone" ? (
            <form onSubmit={handleSendCode}>
              <div className="mb-6">
                <Label htmlFor="phone">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98xxx xxxxx"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading || !phone}>
                {loading ? "Sending…" : "Send code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <div className="mb-6">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="tracking-[0.4em] text-center font-mono"
                />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 6}>
                {loading ? "Verifying…" : "Continue"}
              </Button>
              <button
                type="button"
                className="mt-3 w-full text-center text-sm text-ink-500 hover:text-ink-900"
                onClick={() => {
                  setStep("phone")
                  setCode("")
                  setError(null)
                }}
              >
                Use a different number
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-500">
            Staff or admin?{" "}
            <LinkTransition to="/login" className="font-medium text-stamp-600 hover:underline">
              Sign in here
            </LinkTransition>
          </p>
        </div>
      </AuthChrome>
    </div>
  )
}
