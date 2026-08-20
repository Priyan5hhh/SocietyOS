import { useNavigate } from "react-router-dom"
import { Wrench, LogOut } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Logo } from "@/components/ui/Logo"
import { useAuth } from "@/lib/auth-context"

/**
 * Workers (plumbers, electricians, housekeeping) don't get a portal by
 * design — they're notified about assigned tickets by phone/WhatsApp, and
 * the admin/facility manager updates ticket status on their behalf. This
 * page exists only so a worker account landing here (e.g. after password
 * reset) sees something coherent instead of a redirect loop.
 */
export default function WorkerNotice() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-center">
      <Logo size={36} />
      <Wrench size={32} className="text-ink-300" />
      <h1 className="text-lg font-semibold text-ink-900">No portal for this account</h1>
      <p className="max-w-sm text-sm text-ink-500">
        Worker accounts aren't given a web portal — you'll be notified about assigned tickets by phone or WhatsApp
        instead. If that's wrong, ask your society admin to check your account's role.
      </p>
      <Button
        variant="secondary"
        onClick={() => {
          logout()
          navigate("/login")
        }}
      >
        <LogOut size={16} /> Log out
      </Button>
    </div>
  )
}
