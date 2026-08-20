import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Home, IndianRupee, CalendarDays, ChevronRight, UserPlus, FileText, Vote, Siren, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Modal } from "@/components/ui/Modal"
import { Logo } from "@/components/ui/Logo"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

/**
 * Resident home. Phase 0 shipped identity-only; Phase 1 adds the first real
 * resident-facing feature (My Dues — billing, dues history, receipts) as a
 * link off this shell. More self-service screens (tickets, notices) land in
 * later phases the same way.
 *
 * Phase 4 adds the "Alert security desk" button below. IMPORTANT: this is a
 * software-only internal signal to the on-site guard/admin — never call it
 * "SOS"/"Emergency" or imply a connection to police/fire/ambulance dispatch.
 * See sos_alerts table + resident_raise_sos_alert RPC (supabase migrations)
 * and src/guard/pages/ActiveAlerts.tsx for the receiving side.
 */
export default function ResidentHome() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [alertError, setAlertError] = useState<string | null>(null)

  if (!session || session.kind !== "resident") return null

  async function sendAlert() {
    if (session?.kind !== "resident") return
    setSending(true)
    setAlertError(null)
    try {
      const { error } = await supabaseAnon().rpc("resident_raise_sos_alert", {
        p_society_id: session.society_id,
        p_unit_id: session.unit_id,
        p_resident_id: session.resident_id,
        p_resident_name: session.name,
      })
      if (error) throw error
      setSentAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    } catch (err) {
      setAlertError(errorMessage(err, "Couldn't send the alert — try again."))
    } finally {
      setSending(false)
    }
  }

  function closeConfirm() {
    setConfirmOpen(false)
    setSentAt(null)
    setAlertError(null)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper-50 px-6 text-center">
      <Logo size={36} />
      <Home size={32} className="text-ink-300" />
      <h1 className="text-lg font-semibold text-ink-900">You're logged in, {session.name}</h1>

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="flex w-full max-w-sm items-center justify-center gap-2 rounded-lg border-2 border-rust-600 bg-rust-100 px-4 py-3.5 text-sm font-semibold text-rust-700 shadow-sm transition-colors hover:bg-rust-200"
      >
        <Siren size={18} /> Alert security desk
      </button>
      <p className="max-w-sm text-xs text-ink-400">
        Notifies the guard on duty inside the society. Not a call to police, fire, or ambulance.
      </p>

      <button
        type="button"
        onClick={() => navigate("/resident/dues")}
        className="flex w-full max-w-sm items-center justify-between rounded-lg border border-ink-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-paper-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp-100 text-stamp-700">
            <IndianRupee size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">My Dues</span>
            <span className="block text-xs text-ink-500">View dues, pay, and see receipts</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-ink-300" />
      </button>

      <button
        type="button"
        onClick={() => navigate("/resident/amenities")}
        className="flex w-full max-w-sm items-center justify-between rounded-lg border border-ink-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-paper-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp-100 text-stamp-700">
            <CalendarDays size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">Amenities</span>
            <span className="block text-xs text-ink-500">Book the clubhouse, gym, guest rooms, and more</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-ink-300" />
      </button>

      <button
        type="button"
        onClick={() => navigate("/resident/pre-approvals")}
        className="flex w-full max-w-sm items-center justify-between rounded-lg border border-ink-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-paper-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp-100 text-stamp-700">
            <UserPlus size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">Guest Pre-Approvals</span>
            <span className="block text-xs text-ink-500">Let the guard skip the phone call</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-ink-300" />
      </button>

      <button
        type="button"
        onClick={() => navigate("/resident/documents")}
        className="flex w-full max-w-sm items-center justify-between rounded-lg border border-ink-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-paper-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp-100 text-stamp-700">
            <FileText size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">Documents</span>
            <span className="block text-xs text-ink-500">Bylaws, AGM minutes, and more</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-ink-300" />
      </button>

      <button
        type="button"
        onClick={() => navigate("/resident/vote")}
        className="flex w-full max-w-sm items-center justify-between rounded-lg border border-ink-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-paper-50"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-stamp-100 text-stamp-700">
            <Vote size={16} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink-900">Elections</span>
            <span className="block text-xs text-ink-500">Vote in committee elections</span>
          </span>
        </span>
        <ChevronRight size={18} className="text-ink-300" />
      </button>

      <Card className="max-w-sm p-5 text-left">
        <p className="text-sm text-ink-500">
          More self-service screens — tickets, notices — land in later phases and get built on top of this shell.
        </p>
      </Card>
      <Button
        variant="secondary"
        onClick={() => {
          logout()
          navigate("/resident/login")
        }}
      >
        <LogOut size={16} /> Log out
      </Button>

      <Modal open={confirmOpen} onClose={closeConfirm} title="Alert security desk">
        <div className="space-y-4 text-left">
          {sentAt ? (
            <div className="flex items-start gap-2 rounded-lg border-2 border-stamp-500 bg-stamp-100 p-3 text-sm text-stamp-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              <span>
                Security desk alerted — {session.name}, {new Date().toDateString()} {sentAt}. The guard on duty will
                see this on their Active Alerts screen.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  This sends an in-app alert to the guard on duty at the society gate — it is <strong>not</strong> a
                  call to police, fire, or ambulance. Only use this to reach the on-site security desk.
                </span>
              </div>
              {alertError && <p className="text-sm text-rust-600">{alertError}</p>}
              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={closeConfirm} disabled={sending}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={sendAlert} disabled={sending}>
                  {sending ? "Sending…" : "Confirm — alert security desk"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
