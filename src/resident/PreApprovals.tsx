import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, UserPlus, AlertCircle, Clock, CheckCircle2, Home } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Stamp } from "@/components/ui/Stamp"
import { Logo } from "@/components/ui/Logo"
import { formatDate, formatTime } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface PreApproval {
  id: string
  guest_name: string
  guest_phone: string | null
  valid_until: string
  consumed: boolean
  consumed_at: string | null
  created_at: string
}

/**
 * Resident "Pre-approve a guest" — writes to the existing `pre_approvals`
 * table (already consumed at the gate by src/guard/pages/LogVisitor.tsx)
 * via `resident_create_pre_approval` / `resident_list_pre_approvals`, same
 * anon-key RPC pattern as Phase 1's Dues screen (resident login is still the
 * Phase 0 dev-mode OTP stub, so this is scoped by unit_id, not a real JWT).
 */
export default function PreApprovals() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const unitId = session?.kind === "resident" ? session.unit_id : null
  const residentId = session?.kind === "resident" ? session.resident_id : null
  const isRealUnit = !!unitId && unitId !== "dev-unit"

  const [items, setItems] = useState<PreApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [guestName, setGuestName] = useState("")
  const [guestPhone, setGuestPhone] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    if (!isRealUnit) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabaseAnon().rpc("resident_list_pre_approvals", { p_unit_id: unitId })
      if (rpcError) throw rpcError
      setItems((data ?? []) as PreApproval[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load pre-approvals"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  function openModal() {
    setGuestName("")
    setGuestPhone("")
    const d = new Date()
    d.setDate(d.getDate() + 1)
    setValidUntil(d.toISOString().slice(0, 16))
    setFormError(null)
    setModalOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId) return
    setSaving(true)
    setFormError(null)
    try {
      const { error: rpcError } = await supabaseAnon().rpc("resident_create_pre_approval", {
        p_unit_id: unitId,
        p_resident_id: residentId,
        p_guest_name: guestName,
        p_guest_phone: guestPhone || null,
        p_valid_until: new Date(validUntil).toISOString(),
      })
      if (rpcError) throw rpcError
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(errorMessage(err, "Failed to pre-approve guest"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-100 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate("/resident")} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <Logo size={22} />
        <span className="font-serif text-sm font-semibold text-ink-900">Guest Pre-Approvals</span>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!isRealUnit && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            We couldn't match your phone number to a resident record, so there's no real unit to pre-approve guests for.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button className="mb-4 w-full" onClick={openModal} disabled={!isRealUnit}>
          <UserPlus size={16} /> Pre-approve a guest
        </Button>

        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No pre-approvals yet. Add one so the guard can wave your guest through.</Card>
        ) : (
          <div className="space-y-3">
            {items.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{p.guest_name}</div>
                    {p.guest_phone && <div className="text-xs text-ink-500">{p.guest_phone}</div>}
                  </div>
                  {p.consumed ? (
                    <Stamp tone="stamp">
                      <CheckCircle2 size={12} className="mr-1 inline" /> Arrived
                    </Stamp>
                  ) : new Date(p.valid_until) < new Date() ? (
                    <Stamp tone="ink">Expired</Stamp>
                  ) : (
                    <Stamp tone="amber">
                      <Clock size={12} className="mr-1 inline" /> Pending
                    </Stamp>
                  )}
                </div>
                <div className="mt-2 text-xs text-ink-500">
                  Valid until {formatDate(p.valid_until)} {formatTime(p.valid_until)}
                  {p.consumed_at && <> · arrived {formatDate(p.consumed_at)} {formatTime(p.consumed_at)}</>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Pre-approve a guest">
        <form onSubmit={submit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-2.5 text-xs text-rust-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}
          <div>
            <Label htmlFor="pa-name">Guest name</Label>
            <Input id="pa-name" required value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. Ramesh Kumar" />
          </div>
          <div>
            <Label htmlFor="pa-phone">Guest phone (optional)</Label>
            <Input id="pa-phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="e.g. 98765 43210" />
          </div>
          <div>
            <Label htmlFor="pa-valid">Valid until</Label>
            <Input id="pa-valid" type="datetime-local" required value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <p className="text-xs text-ink-500">The guard will match your guest's name or phone at the gate and let them in without calling you.</p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Pre-approve"}
            </Button>
          </div>
        </form>
      </Modal>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-ink-100 bg-white py-2">
        <button type="button" onClick={() => navigate("/resident")} className="flex flex-col items-center gap-0.5 px-4 py-1 text-ink-400">
          <Home size={18} />
          <span className="text-[10px]">Home</span>
        </button>
      </nav>
      <div className="h-14" />
    </div>
  )
}
