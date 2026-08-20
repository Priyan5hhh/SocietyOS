import { useEffect, useMemo, useState } from "react"
import { Plus, TrendingUp, Sparkles, AlertCircle, BellRing, Send, RotateCw, CircleDollarSign, Receipt, CheckCircle2, FileText, PercentCircle } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { AiPill } from "@/components/ui/AiPill"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate, formatINR, formatTimeAgo } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { queueReminder, queueBulkReminders, listReminders, latestByTarget, type Reminder } from "@/lib/reminders"
import { useCachedFetch } from "@/lib/useCachedFetch"

interface BillCycle {
  id: string
  label: string
  period_start: string
  period_end: string
  due_date: string
  amount_per_unit: number
}

type DueStatus = "paid" | "due" | "overdue"

interface Due {
  id: string
  bill_cycle_id: string
  amount: number
  status: DueStatus
  due_date: string
  late_fee_amount?: number
  units: { block: string; unit_number: string } | null
  bill_cycles: { label: string } | null
}

const statusTone = { paid: "stamp", due: "amber", overdue: "rust" } as const

interface PendingIntimation {
  id: string
  due_id: string
  method: string
  amount: number
  reference_note: string | null
  created_at: string
  dues: { units: { block: string; unit_number: string } | null } | null
}

const offlineMethodLabel: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  other: "Other",
}

function monthBounds(dateStr: string) {
  const d = new Date(dateStr)
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

export default function Billing() {
  const [cycles, setCycles] = useState<BillCycle[]>([])
  const [dues, setDues] = useState<Due[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [label, setLabel] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [amount, setAmount] = useState(4200)

  const [question, setQuestion] = useState("")
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const {
    data: aiSummary,
    loading: aiSummaryLoading,
    error: aiSummaryError,
    refresh: refreshAiSummary,
  } = useCachedFetch("billing-ai-summary", async () => {
    const { summary } = await api.get<{ summary: string }>("/api/billing/ai-summary")
    return summary
  })
  const [reminders, setReminders] = useState<Map<string, Reminder>>(new Map())
  const [busyDueId, setBusyDueId] = useState<string | null>(null)
  const [bulkReminding, setBulkReminding] = useState(false)
  const [bulkNote, setBulkNote] = useState<string | null>(null)

  const [gstBusyId, setGstBusyId] = useState<string | null>(null)
  const [gstNote, setGstNote] = useState<string | null>(null)
  const [applyingLateFees, setApplyingLateFees] = useState(false)

  const [lateFeeRate, setLateFeeRate] = useState(0)
  const [graceDays, setGraceDays] = useState(0)
  const [gstin, setGstin] = useState("")
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configNote, setConfigNote] = useState<string | null>(null)

  const [pending, setPending] = useState<PendingIntimation[]>([])
  const [reconcileTarget, setReconcileTarget] = useState<{ due: Due; intimation?: PendingIntimation } | null>(null)
  const [rMethod, setRMethod] = useState("cash")
  const [rAmount, setRAmount] = useState(0)
  const [rReference, setRReference] = useState("")
  const [rDate, setRDate] = useState("")
  const [rSaving, setRSaving] = useState(false)
  const [rError, setRError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [cyclesRes, duesRes] = await Promise.all([
        api.get<{ bill_cycles: BillCycle[] }>("/api/billing/cycles"),
        api.get<{ dues: Due[] }>("/api/billing/dues"),
      ])
      setCycles(cyclesRes.bill_cycles)
      setDues(duesRes.dues)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data")
    } finally {
      setLoading(false)
    }
  }

  async function loadPending() {
    try {
      const { data, error: sbError } = await getStaffSupabase()
        .from("payments")
        .select("id, due_id, method, amount, reference_note, created_at, dues(units(block, unit_number))")
        .eq("status", "created")
        .order("created_at", { ascending: false })
      if (sbError) throw sbError
      setPending((data ?? []) as unknown as PendingIntimation[])
    } catch {
      // Non-fatal — the offline-reconcile section just won't show intimations.
    }
  }

  async function loadConfig() {
    setConfigLoading(true)
    try {
      const { societyId } = getStaffClaims()
      if (!societyId) return
      const { data, error: sbError } = await getStaffSupabase()
        .from("society_configs")
        .select("late_fee_rate_annual_pct, late_fee_grace_days, gstin")
        .eq("society_id", societyId)
        .maybeSingle()
      if (sbError) throw sbError
      if (data) {
        setLateFeeRate(Number(data.late_fee_rate_annual_pct) || 0)
        setGraceDays(Number(data.late_fee_grace_days) || 0)
        setGstin(data.gstin ?? "")
      }
    } catch {
      // Non-fatal — settings form just falls back to defaults.
    } finally {
      setConfigLoading(false)
    }
  }

  async function saveConfig(e: React.FormEvent) {
    e.preventDefault()
    setConfigSaving(true)
    setConfigNote(null)
    try {
      const { societyId } = getStaffClaims()
      if (!societyId) throw new Error("No society in session")
      const { error: sbError } = await getStaffSupabase()
        .from("society_configs")
        .update({
          late_fee_rate_annual_pct: lateFeeRate,
          late_fee_grace_days: graceDays,
          gstin: gstin.trim() || null,
        })
        .eq("society_id", societyId)
      if (sbError) throw sbError
      setConfigNote("Saved.")
    } catch (err) {
      setConfigNote(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setConfigSaving(false)
    }
  }

  useEffect(() => {
    load()
    loadPending()
    loadConfig()
    listReminders("due")
      .then(({ reminders }) => setReminders(latestByTarget(reminders)))
      .catch(() => {})
  }, [])

  function openReconcile(due: Due, intimation?: PendingIntimation) {
    setReconcileTarget({ due, intimation })
    setRMethod(intimation?.method ?? "cash")
    setRAmount(intimation?.amount ?? due.amount)
    setRReference(intimation?.reference_note ?? "")
    setRDate(new Date().toISOString().slice(0, 10))
    setRError(null)
  }

  async function submitReconcile(e: React.FormEvent) {
    e.preventDefault()
    if (!reconcileTarget) return
    setRSaving(true)
    setRError(null)
    try {
      const sb = getStaffSupabase()
      if (reconcileTarget.intimation) {
        const { error: sbError } = await sb.rpc("settle_pending_payment", {
          p_payment_id: reconcileTarget.intimation.id,
          p_method: rMethod,
          p_reference_note: rReference || null,
          p_settled_at: new Date(rDate).toISOString(),
        })
        if (sbError) throw sbError
      } else {
        const { error: sbError } = await sb.rpc("reconcile_offline_payment", {
          p_due_id: reconcileTarget.due.id,
          p_method: rMethod,
          p_amount: rAmount,
          p_reference_note: rReference || null,
          p_settled_at: new Date(rDate).toISOString(),
        })
        if (sbError) throw sbError
      }
      setReconcileTarget(null)
      await Promise.all([load(), loadPending()])
    } catch (err) {
      setRError(err instanceof Error ? err.message : "Failed to record payment")
    } finally {
      setRSaving(false)
    }
  }

  async function remind(due: Due, kind: "payment_reminder" | "send_bill") {
    setBusyDueId(`${due.id}:${kind}`)
    try {
      const { reminder } = await queueReminder("due", due.id, kind)
      setReminders((prev) => new Map(prev).set(due.id, reminder))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue reminder")
    } finally {
      setBusyDueId(null)
    }
  }

  async function remindAllOverdue() {
    const overdueIds = dues.filter((d) => d.status === "overdue").map((d) => d.id)
    if (overdueIds.length === 0) return
    setBulkReminding(true)
    setBulkNote(null)
    try {
      const { count } = await queueBulkReminders("due", overdueIds, "payment_reminder")
      setBulkNote(`Queued ${count} reminder${count === 1 ? "" : "s"}.`)
      const { reminders: fresh } = await listReminders("due")
      setReminders(latestByTarget(fresh))
    } catch (err) {
      setBulkNote(err instanceof Error ? err.message : "Failed to queue reminders")
    } finally {
      setBulkReminding(false)
    }
  }

  async function generateInvoice(due: Due) {
    setGstBusyId(due.id)
    setGstNote(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: rpcError } = await sb.rpc("generate_gst_invoice", { p_due_id: due.id })
      if (rpcError) throw rpcError
      setGstNote(`Invoice ${data.invoice_number} generated for ${due.units ? `${due.units.block}-${due.units.unit_number}` : "this due"}.`)
    } catch (err) {
      setGstNote(err instanceof Error ? err.message : "Failed to generate invoice")
    } finally {
      setGstBusyId(null)
    }
  }

  async function applyLateFees() {
    setApplyingLateFees(true)
    setGstNote(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const { data, error: rpcError } = await sb.rpc("apply_late_fees", { p_society_id: societyId })
      if (rpcError) throw rpcError
      setGstNote(`Applied/updated late fees on ${data} due${data === 1 ? "" : "s"}.`)
      await load()
    } catch (err) {
      setGstNote(err instanceof Error ? err.message : "Failed to apply late fees")
    } finally {
      setApplyingLateFees(false)
    }
  }

  const duesByCycle = useMemo(() => {
    const map = new Map<string, Due[]>()
    for (const d of dues) {
      const list = map.get(d.bill_cycle_id) ?? []
      list.push(d)
      map.set(d.bill_cycle_id, list)
    }
    return map
  }, [dues])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { start, end } = monthBounds(dueDate)
      const { bill_cycle } = await api.post<{ bill_cycle: BillCycle }>("/api/billing/cycles", {
        label,
        period_start: start,
        period_end: end,
        due_date: dueDate,
        amount_per_unit: amount,
      })
      setCycles((prev) => [bill_cycle, ...prev.filter((c) => c.id !== bill_cycle.id)])
      await load()
      setModalOpen(false)
      setLabel("")
      setDueDate("")
      setAmount(4200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bill cycle")
    } finally {
      setSaving(false)
    }
  }

  async function askAi() {
    if (!question.trim()) return
    setAiLoading(true)
    setAiAnswer(null)
    try {
      const { answer } = await api.post<{ answer: string }>("/api/billing/ai-query", { question })
      setAiAnswer(answer)
    } catch {
      setAiAnswer("AI suggestion unavailable — try again shortly.")
    } finally {
      setAiLoading(false)
    }
  }

  const latestCycle = cycles[0]
  const latestDues = latestCycle ? duesByCycle.get(latestCycle.id) ?? [] : dues

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Create bill cycles and track dues collection."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New bill cycle
          </Button>
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {aiSummaryLoading ? (
          <div className="mb-4">
            <AiPill label="AI is summarizing billing…" />
          </div>
        ) : aiSummary ? (
          <div className="animate-fade-in mb-4 flex items-start gap-2 rounded-lg border border-stamp-200 bg-stamp-50 p-3 text-sm text-stamp-800">
            <Sparkles size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{aiSummary}</span>
            <button
              type="button"
              onClick={refreshAiSummary}
              aria-label="Refresh summary"
              title="Refresh summary"
              className="shrink-0 rounded-md p-1 text-stamp-600 hover:bg-stamp-100"
            >
              <RotateCw size={14} />
            </button>
          </div>
        ) : aiSummaryError ? (
          <div className="mb-4 flex items-center gap-2 text-xs text-ink-400">
            AI summary unavailable right now.
            <button type="button" onClick={refreshAiSummary} className="font-medium text-ink-500 hover:underline">
              Retry
            </button>
          </div>
        ) : null}

        {loading ? (
          <Card>
            <TableSkeleton rows={3} cols={3} />
          </Card>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              {cycles.map((c) => {
                const cycleDues = duesByCycle.get(c.id) ?? []
                const paidCount = cycleDues.filter((d) => d.status === "paid").length
                const pct = cycleDues.length > 0 ? Math.round((paidCount / cycleDues.length) * 100) : 0
                return (
                  <Card key={c.id} className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold text-ink-900">{c.label}</div>
                        <div className="mt-0.5 text-xs text-ink-500">Due {formatDate(c.due_date)}</div>
                      </div>
                      <TrendingUp size={16} className="text-stamp-600" />
                    </div>
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-500">
                        <span>
                          {paidCount}/{cycleDues.length} paid
                        </span>
                        <span className="font-mono font-medium text-ink-900">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full rounded-full bg-stamp-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="mt-3 font-mono text-xs text-ink-500">{formatINR(c.amount_per_unit)} / unit</div>
                  </Card>
                )
              })}
            </div>

            {pending.length > 0 && (
              <Card className="mb-6 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <CheckCircle2 size={16} className="text-amber-600" /> Pending resident intimations
                </div>
                <div className="space-y-2">
                  {pending.map((p) => {
                    const due = dues.find((d) => d.id === p.due_id)
                    return (
                      <div key={p.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs text-ink-500">
                            {p.dues?.units ? `${p.dues.units.block}-${p.dues.units.unit_number}` : due?.units ? `${due.units.block}-${due.units.unit_number}` : "—"}
                          </span>{" "}
                          <span className="font-mono font-medium">{formatINR(p.amount)}</span> via{" "}
                          {offlineMethodLabel[p.method] ?? p.method}
                          {p.reference_note && <span className="text-ink-500"> · {p.reference_note}</span>}
                        </div>
                        {due ? (
                          <Button size="sm" variant="secondary" onClick={() => openReconcile(due, p)}>
                            Verify &amp; settle
                          </Button>
                        ) : (
                          <span className="text-xs text-ink-400">due not in current cycle</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            <Card className="mb-6 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Sparkles size={16} className="text-stamp-600" /> Ask about billing
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. How much is overdue right now?"
                  onKeyDown={(e) => e.key === "Enter" && askAi()}
                />
                <Button type="button" onClick={askAi} disabled={aiLoading || !question.trim()}>
                  {aiLoading ? "Thinking…" : "Ask"}
                </Button>
              </div>
              {aiLoading && <p className="mt-2 text-xs text-ink-500">Can take up to a minute — the AI reasons through the numbers before answering.</p>}
              {aiAnswer && <p className="mt-3 text-sm text-ink-700">{aiAnswer}</p>}
            </Card>

            <Card className="mb-6 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <PercentCircle size={16} className="text-stamp-600" /> Late fees &amp; GST settings
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Late fees only apply once a rate above 0% is set here. GSTIN is optional — invoices generate without one.
              </p>
              {!configLoading && (
                <form onSubmit={saveConfig} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                  <div>
                    <Label htmlFor="cfg-rate">Late fee rate (% / yr)</Label>
                    <Input
                      id="cfg-rate"
                      type="number"
                      min={0}
                      max={21}
                      step={0.5}
                      value={lateFeeRate}
                      onChange={(e) => setLateFeeRate(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfg-grace">Grace period (days)</Label>
                    <Input
                      id="cfg-grace"
                      type="number"
                      min={0}
                      value={graceDays}
                      onChange={(e) => setGraceDays(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cfg-gstin">GSTIN (optional)</Label>
                    <Input id="cfg-gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" size="sm" disabled={configSaving}>
                      {configSaving ? "Saving…" : "Save settings"}
                    </Button>
                    {configNote && <span className="text-xs text-ink-500">{configNote}</span>}
                  </div>
                </form>
              )}
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dues — {latestCycle?.label ?? "All cycles"}</CardTitle>
                <div className="flex items-center gap-3">
                  {bulkNote && <span className="text-xs text-ink-500">{bulkNote}</span>}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={applyLateFees}
                    disabled={applyingLateFees}
                  >
                    <PercentCircle size={14} /> {applyingLateFees ? "Applying…" : "Apply late fees"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={remindAllOverdue}
                    disabled={bulkReminding || latestDues.every((d) => d.status !== "overdue")}
                  >
                    <BellRing size={14} /> {bulkReminding ? "Queuing…" : "Remind all overdue"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <Thead>
                    <tr>
                      <Th>Unit</Th>
                      <Th>Amount</Th>
                      <Th>Late fee</Th>
                      <Th>Due date</Th>
                      <Th>Status</Th>
                      <Th>Reminders</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {gstNote && (
                      <Tr>
                        <Td colSpan={6} className="bg-stamp-50 text-xs text-stamp-800">
                          {gstNote}
                        </Td>
                      </Tr>
                    )}
                    {latestDues.map((d) => {
                      const lastReminder = reminders.get(d.id)
                      return (
                        <Tr key={d.id}>
                          <Td className="font-mono text-xs">{d.units ? `${d.units.block}-${d.units.unit_number}` : "—"}</Td>
                          <Td className="font-mono">{formatINR(d.amount)}</Td>
                          <Td className="font-mono text-xs text-rust-700">{d.late_fee_amount ? formatINR(d.late_fee_amount) : "—"}</Td>
                          <Td className="text-ink-500">{formatDate(d.due_date)}</Td>
                          <Td>
                            <Stamp tone={statusTone[d.status]}>{d.status}</Stamp>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-3">
                              {d.status !== "paid" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => remind(d, "payment_reminder")}
                                    disabled={busyDueId === `${d.id}:payment_reminder`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                                  >
                                    <BellRing size={12} /> Remind
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => remind(d, "send_bill")}
                                    disabled={busyDueId === `${d.id}:send_bill`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                                  >
                                    <Send size={12} /> Send bill
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openReconcile(d)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-stamp-700 hover:underline"
                                  >
                                    <CircleDollarSign size={12} /> Mark paid (offline)
                                  </button>
                                  {lastReminder && (
                                    <span className="text-xs text-ink-400">{formatTimeAgo(lastReminder.created_at)}</span>
                                  )}
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                                  <Receipt size={12} /> Receipt on record
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => generateInvoice(d)}
                                disabled={gstBusyId === d.id}
                                className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline disabled:opacity-50"
                              >
                                <FileText size={12} /> {gstBusyId === d.id ? "Generating…" : "GST invoice"}
                              </button>
                            </div>
                          </Td>
                        </Tr>
                      )
                    })}
                  </Tbody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New bill cycle">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="bc-label">Cycle label</Label>
            <Input
              id="bc-label"
              required
              placeholder="e.g. Maintenance — Sep 2026"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bc-due">Due date</Label>
              <Input id="bc-due" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bc-amount">Amount per unit (₹)</Label>
              <Input
                id="bc-amount"
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-ink-500">
            Generates one due per existing unit for {dueDate ? `${monthBounds(dueDate).start} to ${monthBounds(dueDate).end}` : "the selected month"}.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create cycle"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!reconcileTarget} onClose={() => setReconcileTarget(null)} title="Mark paid (offline)">
        {reconcileTarget && (
          <form onSubmit={submitReconcile} className="space-y-4">
            <div className="rounded-lg border border-ink-100 bg-paper-50 p-3 text-sm">
              <div className="text-ink-500">
                {reconcileTarget.due.units ? `Unit ${reconcileTarget.due.units.block}-${reconcileTarget.due.units.unit_number}` : "Unit —"}
              </div>
              <div className="font-mono font-semibold text-ink-900">{formatINR(reconcileTarget.due.amount)} due</div>
              {reconcileTarget.intimation && (
                <div className="mt-1 text-xs text-amber-700">Settling a resident's "I already paid" intimation.</div>
              )}
            </div>
            {rError && (
              <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-2.5 text-xs text-rust-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {rError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="r-method">Method</Label>
                <select
                  id="r-method"
                  value={rMethod}
                  onChange={(e) => setRMethod(e.target.value)}
                  className="mt-1 w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="r-amount">Amount (₹)</Label>
                <Input
                  id="r-amount"
                  type="number"
                  required
                  value={rAmount}
                  onChange={(e) => setRAmount(Number(e.target.value))}
                  disabled={!!reconcileTarget.intimation}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="r-reference">Reference note {rMethod !== "cash" && "(required)"}</Label>
              <Input
                id="r-reference"
                required={rMethod !== "cash"}
                value={rReference}
                onChange={(e) => setRReference(e.target.value)}
                placeholder="Cheque no. / UTR / UPI ref"
              />
            </div>
            <div>
              <Label htmlFor="r-date">Date received</Label>
              <Input
                id="r-date"
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={rDate}
                onChange={(e) => setRDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setReconcileTarget(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={rSaving}>
                {rSaving ? "Saving…" : "Confirm & settle"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
