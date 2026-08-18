import { useEffect, useMemo, useState } from "react"
import { Plus, TrendingUp, Sparkles, AlertCircle, BellRing, Send, RotateCw } from "lucide-react"
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
  units: { block: string; unit_number: string } | null
  bill_cycles: { label: string } | null
}

const statusTone = { paid: "stamp", due: "amber", overdue: "rust" } as const

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

  useEffect(() => {
    load()
    listReminders("due")
      .then(({ reminders }) => setReminders(latestByTarget(reminders)))
      .catch(() => {})
  }, [])

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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Dues — {latestCycle?.label ?? "All cycles"}</CardTitle>
                <div className="flex items-center gap-3">
                  {bulkNote && <span className="text-xs text-ink-500">{bulkNote}</span>}
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
                      <Th>Due date</Th>
                      <Th>Status</Th>
                      <Th>Reminders</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {latestDues.map((d) => {
                      const lastReminder = reminders.get(d.id)
                      return (
                        <Tr key={d.id}>
                          <Td className="font-mono text-xs">{d.units ? `${d.units.block}-${d.units.unit_number}` : "—"}</Td>
                          <Td className="font-mono">{formatINR(d.amount)}</Td>
                          <Td className="text-ink-500">{formatDate(d.due_date)}</Td>
                          <Td>
                            <Stamp tone={statusTone[d.status]}>{d.status}</Stamp>
                          </Td>
                          <Td>
                            <div className="flex items-center gap-3">
                              {d.status !== "paid" && (
                                <button
                                  type="button"
                                  onClick={() => remind(d, "payment_reminder")}
                                  disabled={busyDueId === `${d.id}:payment_reminder`}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                                >
                                  <BellRing size={12} /> Remind
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => remind(d, "send_bill")}
                                disabled={busyDueId === `${d.id}:send_bill`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                              >
                                <Send size={12} /> Send bill
                              </button>
                              {lastReminder && (
                                <span className="text-xs text-ink-400">{formatTimeAgo(lastReminder.created_at)}</span>
                              )}
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
    </div>
  )
}
