import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, IndianRupee, Receipt, AlertCircle, CheckCircle2, Clock, Home } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Stamp, type StampTone } from "@/components/ui/Stamp"
import { Logo } from "@/components/ui/Logo"
import { formatDate, formatINR } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"

type DueStatus = "paid" | "due" | "overdue"

interface Due {
  id: string
  amount: number
  status: DueStatus
  due_date: string
  paid_at: string | null
}

interface Payment {
  id: string
  due_id: string
  method: string
  amount: number
  status: "created" | "authorized" | "captured" | "failed" | "refunded"
  reference_note: string | null
  receipt_number: string | null
  receipt_issued_at: string | null
  settled_at: string | null
  created_at: string
}

const dueStatusTone: Record<DueStatus, StampTone> = { paid: "stamp", due: "amber", overdue: "rust" }
const methodLabel: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  other: "Other",
  razorpay: "Online",
}

/**
 * Resident "My Dues" — dues list, a Pay Now flow that is a real UI but
 * stubbed at the final charge step (no payment gateway account exists yet —
 * see docs/pipeline/NEEDS_YOUR_INPUT.md), an "I already paid" intimation
 * that writes a real pending payment row for admin review, and a receipts/
 * history tab. Reads/writes go straight to Supabase via anon-key RPCs
 * (`resident_get_dues`, `resident_get_payments`, `resident_intimate_payment`)
 * scoped by the resident's unit_id — see src/lib/services/supabase.ts for
 * why this can't yet be a real per-resident-authenticated RLS session.
 */
export default function ResidentDues() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const unitId = session?.kind === "resident" ? session.unit_id : null
  const isRealUnit = !!unitId && unitId !== "dev-unit"

  const [tab, setTab] = useState<"dues" | "receipts">("dues")
  const [dues, setDues] = useState<Due[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [payModalDue, setPayModalDue] = useState<Due | null>(null)
  const [payStep, setPayStep] = useState<"confirm" | "stub" | "intimate">("confirm")
  const [method, setMethod] = useState("upi")
  const [referenceNote, setReferenceNote] = useState("")
  const [intimateAmount, setIntimateAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [intimateNote, setIntimateNote] = useState<string | null>(null)

  async function load() {
    if (!isRealUnit) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [duesRes, paymentsRes] = await Promise.all([
        supabaseAnon().rpc("resident_get_dues", { p_unit_id: unitId }),
        supabaseAnon().rpc("resident_get_payments", { p_unit_id: unitId }),
      ])
      if (duesRes.error) throw duesRes.error
      if (paymentsRes.error) throw paymentsRes.error
      setDues((duesRes.data ?? []) as Due[])
      setPayments((paymentsRes.data ?? []) as Payment[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dues")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  function openPay(due: Due) {
    setPayModalDue(due)
    setPayStep("confirm")
    setMethod("upi")
    setReferenceNote("")
    setIntimateAmount(due.amount)
    setIntimateNote(null)
  }

  function closePay() {
    setPayModalDue(null)
  }

  async function submitIntimation() {
    if (!payModalDue || !unitId) return
    setSubmitting(true)
    setIntimateNote(null)
    try {
      const { error: rpcError } = await supabaseAnon().rpc("resident_intimate_payment", {
        p_due_id: payModalDue.id,
        p_unit_id: unitId,
        p_method: method,
        p_amount: intimateAmount,
        p_reference_note: referenceNote || null,
      })
      if (rpcError) throw rpcError
      setIntimateNote("Thanks — we've flagged this for the admin to verify and settle. It'll show as paid once confirmed.")
      await load()
    } catch (err) {
      setIntimateNote(err instanceof Error ? err.message : "Couldn't submit — try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const pendingByDue = new Map(payments.filter((p) => p.status === "created").map((p) => [p.due_id, p]))

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-100 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate("/resident")}
          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Logo size={22} />
        <span className="font-serif text-sm font-semibold text-ink-900">My Dues</span>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!isRealUnit && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            We couldn't match your phone number to a resident record, so there's no real dues data to show for this
            dev-mode login. Ask your admin to check the number on file.
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-1 rounded-lg border border-ink-100 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("dues")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "dues" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            Dues
          </button>
          <button
            type="button"
            onClick={() => setTab("receipts")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "receipts" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            History &amp; receipts
          </button>
        </div>

        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : tab === "dues" ? (
          dues.length === 0 ? (
            <Card className="p-6 text-center text-sm text-ink-500">No dues on record yet.</Card>
          ) : (
            <div className="space-y-3">
              {dues.map((d) => {
                const pending = pendingByDue.get(d.id)
                return (
                  <Card key={d.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-lg font-semibold text-ink-900">{formatINR(d.amount)}</div>
                        <div className="mt-0.5 text-xs text-ink-500">Due {formatDate(d.due_date)}</div>
                      </div>
                      <Stamp tone={dueStatusTone[d.status]}>{d.status}</Stamp>
                    </div>
                    {d.status !== "paid" && (
                      <div className="mt-3">
                        {pending ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                            <Clock size={13} /> Payment intimated — awaiting admin verification
                          </div>
                        ) : (
                          <Button size="sm" className="w-full" onClick={() => openPay(d)}>
                            <IndianRupee size={14} /> Pay now
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        ) : payments.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No payments recorded yet.</Card>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-mono text-base font-semibold text-ink-900">{formatINR(p.amount)}</div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {methodLabel[p.method] ?? p.method} · {formatDate(p.created_at)}
                    </div>
                  </div>
                  <Stamp tone={p.status === "captured" ? "stamp" : p.status === "failed" ? "rust" : "amber"}>
                    {p.status === "captured" ? "settled" : p.status === "created" ? "pending review" : p.status}
                  </Stamp>
                </div>
                {p.receipt_number && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-ink-100 bg-paper-50 px-2.5 py-2 text-xs">
                    <Receipt size={14} className="text-stamp-600" />
                    <span className="font-mono font-medium text-ink-900">{p.receipt_number}</span>
                    {p.receipt_issued_at && <span className="text-ink-400">· issued {formatDate(p.receipt_issued_at)}</span>}
                  </div>
                )}
                {p.reference_note && <div className="mt-2 text-xs text-ink-500">Ref: {p.reference_note}</div>}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!payModalDue} onClose={closePay} title="Pay dues">
        {payModalDue && (
          <div className="space-y-4">
            {payStep === "confirm" && (
              <>
                <div className="rounded-lg border border-ink-100 bg-paper-50 p-4">
                  <div className="text-xs text-ink-500">Amount due</div>
                  <div className="font-mono text-2xl font-semibold text-ink-900">{formatINR(payModalDue.amount)}</div>
                  <div className="mt-1 text-xs text-ink-500">Due {formatDate(payModalDue.due_date)}</div>
                </div>
                <Button className="w-full" onClick={() => setPayStep("stub")}>
                  Continue to pay
                </Button>
              </>
            )}

            {payStep === "stub" && (
              <>
                <div className="flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
                  <Clock size={16} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold uppercase tracking-wide text-xs">Online payments launching soon</p>
                    <p className="mt-1">
                      UPI / card / net banking checkout isn't live yet — the society needs a payment-gateway account
                      first. In the meantime, pay via UPI or bank transfer to your society's account, then tap
                      "I already paid" below so the admin can confirm it and mark this due settled.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 opacity-50">
                  {["UPI", "Card", "Net banking"].map((m) => (
                    <div key={m} className="rounded-lg border-2 border-dashed border-ink-200 py-3 text-center text-xs font-medium text-ink-400">
                      {m}
                    </div>
                  ))}
                </div>
                <Button variant="secondary" className="w-full" onClick={() => setPayStep("intimate")}>
                  <CheckCircle2 size={16} /> I already paid
                </Button>
              </>
            )}

            {payStep === "intimate" && (
              <>
                <div>
                  <Label htmlFor="pay-method">Method used</Label>
                  <select
                    id="pay-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="pay-amount">Amount paid (₹)</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    value={intimateAmount}
                    onChange={(e) => setIntimateAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="pay-ref">Reference (UPI/UTR/cheque no.)</Label>
                  <Input
                    id="pay-ref"
                    value={referenceNote}
                    onChange={(e) => setReferenceNote(e.target.value)}
                    placeholder="e.g. UPI ref 4021XXXXXX"
                  />
                </div>
                {intimateNote && <p className="text-sm text-ink-700">{intimateNote}</p>}
                <div className="flex justify-end gap-3 pt-1">
                  <Button type="button" variant="secondary" onClick={closePay}>
                    Close
                  </Button>
                  <Button type="button" onClick={submitIntimation} disabled={submitting || intimateNote != null}>
                    {submitting ? "Submitting…" : "Submit"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-ink-100 bg-white py-2">
        <button type="button" onClick={() => navigate("/resident")} className="flex flex-col items-center gap-0.5 px-4 py-1 text-ink-400">
          <Home size={18} />
          <span className="text-[10px]">Home</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-0.5 px-4 py-1 text-stamp-700">
          <IndianRupee size={18} />
          <span className="text-[10px] font-medium">Dues</span>
        </button>
      </nav>
      <div className="h-14" />
    </div>
  )
}
