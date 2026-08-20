import { useEffect, useState } from "react"
import { LinkTransition } from "@/components/ui/NavTransition"
import { Receipt, Ticket, CalendarClock, Users, AlertCircle, Sparkles, RotateCw } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { StatTile } from "@/admin/components/StatTile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Stamp } from "@/components/ui/Stamp"
import { AiPill } from "@/components/ui/AiPill"
import { formatDate, formatINR } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { useCachedFetch } from "@/lib/useCachedFetch"
import { DashboardSkeleton } from "@/components/ui/Skeleton"
import { errorMessage } from "@/lib/utils"

interface TicketRow {
  id: string
  priority: "low" | "medium" | "high"
  status: "new" | "in_progress" | "resolved" | "reopened"
  resident_name: string | null
  description: string
  units: { block: string; unit_number: string } | null
}
interface DueRow {
  id: string
  bill_cycle_id: string
  amount: number
  status: "paid" | "due" | "overdue"
  due_date: string
  units: { block: string; unit_number: string } | null
}
interface NoticeRow {
  id: string
  title: string
  posted_at: string
}
interface ResidentRow {
  id: string
  units: { block: string } | null
}
interface BillCycleRow {
  id: string
  label: string
}

const priorityTone = { high: "rust", medium: "amber", low: "ink" } as const
const statusTone = { new: "rust", in_progress: "amber", resolved: "stamp", reopened: "rust" } as const

export default function DashboardHome() {
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [dues, setDues] = useState<DueRow[]>([])
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [residents, setResidents] = useState<ResidentRow[]>([])
  const [cycles, setCycles] = useState<BillCycleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    data: digest,
    loading: digestLoading,
    error: digestError,
    refresh: refreshDigest,
  } = useCachedFetch("dashboard-ai-digest", async () => {
    const { digest } = await api.get<{ digest: string }>("/api/dashboard/ai-digest")
    return digest
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [t, d, n, r, c] = await Promise.all([
          api.get<{ tickets: TicketRow[] }>("/api/tickets"),
          api.get<{ dues: DueRow[] }>("/api/billing/dues"),
          api.get<{ notices: NoticeRow[] }>("/api/notices"),
          api.get<{ residents: ResidentRow[] }>("/api/residents"),
          api.get<{ bill_cycles: BillCycleRow[] }>("/api/billing/cycles"),
        ])
        setTickets(t.tickets)
        setDues(d.dues)
        setNotices(n.notices)
        setResidents(r.residents)
        setCycles(c.bill_cycles)
      } catch (err) {
        setError(errorMessage(err, "Failed to load dashboard"))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Today's snapshot across billing, tickets and notices." />
        <DashboardSkeleton />
      </div>
    )
  }

  const pendingBills = dues.filter((d) => d.status !== "paid")
  const openTickets = tickets.filter((t) => t.status !== "resolved")
  const upcomingDue = dues.filter((d) => d.status === "due").sort((a, b) => a.due_date.localeCompare(b.due_date))[0]
  const currentCycle = cycles[0]
  const currentCycleDues = dues.filter((d) => d.bill_cycle_id === currentCycle?.id)
  const paidInCurrentCycle = currentCycleDues.filter((d) => d.status === "paid").length

  return (
    <div>
      <PageHeader title="Dashboard" description="Today's snapshot across billing, tickets and notices." />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {digestLoading ? (
          <div className="mb-4">
            <AiPill label="AI is preparing today's digest…" />
          </div>
        ) : digest ? (
          <div className="animate-fade-in mb-4 flex items-start gap-2 rounded-lg border border-stamp-200 bg-stamp-50 p-3 text-sm text-stamp-800">
            <Sparkles size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{digest}</span>
            <button
              type="button"
              onClick={refreshDigest}
              aria-label="Refresh digest"
              title="Refresh digest"
              className="shrink-0 rounded-md p-1 text-stamp-600 hover:bg-stamp-100"
            >
              <RotateCw size={14} />
            </button>
          </div>
        ) : digestError ? (
          <div className="mb-4 flex items-center gap-2 text-xs text-ink-400">
            Digest unavailable right now.
            <button type="button" onClick={refreshDigest} className="font-medium text-ink-500 hover:underline">
              Retry
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="animate-rise-in" style={{ animationDelay: "0ms" }}>
            <StatTile
              label="Pending bills"
              value={String(pendingBills.length)}
              hint={`of ${dues.length} this cycle`}
              icon={<Receipt size={18} />}
              tone="amber"
            />
          </div>
          <div className="animate-rise-in" style={{ animationDelay: "40ms" }}>
            <StatTile
              label="Open tickets"
              value={String(openTickets.length)}
              hint={`${tickets.filter((t) => t.priority === "high" && t.status !== "resolved").length} high priority`}
              icon={<Ticket size={18} />}
              tone="rust"
            />
          </div>
          <div className="animate-rise-in" style={{ animationDelay: "80ms" }}>
            <StatTile
              label="Upcoming due"
              value={upcomingDue ? formatDate(upcomingDue.due_date) : "—"}
              hint={
                upcomingDue
                  ? `${upcomingDue.units ? `${upcomingDue.units.block}-${upcomingDue.units.unit_number}` : ""} · ${formatINR(upcomingDue.amount)}`
                  : undefined
              }
              icon={<CalendarClock size={18} />}
              tone="ink"
            />
          </div>
          <div className="animate-rise-in" style={{ animationDelay: "120ms" }}>
            <StatTile
              label="Total residents"
              value={String(residents.length)}
              hint={`${new Set(residents.map((r) => r.units?.block).filter(Boolean)).size} blocks`}
              icon={<Users size={18} />}
              tone="stamp"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="animate-rise-in lg:col-span-2" style={{ animationDelay: "160ms" }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent tickets</CardTitle>
              <LinkTransition to="/admin/tickets" className="text-xs font-medium text-ink-700 hover:underline">
                View all
              </LinkTransition>
            </CardHeader>
            <CardContent className="space-y-3">
              {tickets.length === 0 && <p className="text-sm text-ink-500">No tickets yet.</p>}
              {tickets.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-start justify-between gap-4 rounded-lg border border-ink-100 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-500">
                        {t.units ? `${t.units.block}-${t.units.unit_number}` : "—"}
                      </span>
                      <span className="text-sm font-medium text-ink-900">{t.resident_name ?? "Unknown"}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-500">{t.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Stamp tone={priorityTone[t.priority]}>{t.priority}</Stamp>
                    <Stamp tone={statusTone[t.status]}>{t.status.replace("_", " ")}</Stamp>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="animate-rise-in" style={{ animationDelay: "200ms" }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Latest notices</CardTitle>
              <LinkTransition to="/admin/notices" className="text-xs font-medium text-ink-700 hover:underline">
                View all
              </LinkTransition>
            </CardHeader>
            <CardContent className="space-y-3">
              {notices.length === 0 && <p className="text-sm text-ink-500">No notices yet.</p>}
              {notices.slice(0, 3).map((n) => (
                <div key={n.id} className="rounded-lg border border-ink-100 p-3">
                  <div className="text-sm font-medium text-ink-900">{n.title}</div>
                  <div className="mt-1 text-xs text-ink-500">{formatDate(n.posted_at)}</div>
                </div>
              ))}
              {currentCycle && (
                <div className="rounded-lg bg-paper-100 p-3 text-xs text-ink-500">
                  <span className="font-mono font-semibold text-ink-700">{currentCycle.label}</span> — {paidInCurrentCycle}/
                  {currentCycleDues.length} units paid
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
