import { useEffect, useState } from "react"
import { MessageCircle, Plus, AlertCircle, Sparkles, BellRing, RotateCw } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Stamp } from "@/components/ui/Stamp"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Input"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { NoTicketsIllustration } from "@/components/illustrations"
import { formatDate, formatTime, formatTimeAgo } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { queueReminder, listReminders, latestByTarget, type Reminder } from "@/lib/reminders"
import { useTicketDraft, TICKET_CREATED_EVENT_NAME } from "@/admin/context/TicketDraftContext"
import { useCachedFetch } from "@/lib/useCachedFetch"

type TicketStatus = "new" | "in_progress" | "resolved" | "reopened"
type TicketPriority = "low" | "medium" | "high"

interface Ticket {
  id: string
  category: string
  subcategory: string | null
  priority: TicketPriority
  status: TicketStatus
  description: string
  original_message: string | null
  resident_name: string | null
  created_at: string
  units: { block: string; unit_number: string } | null
}

const priorityTone = { high: "rust", medium: "amber", low: "ink" } as const
const statusTone = { new: "rust", in_progress: "amber", resolved: "stamp", reopened: "rust" } as const
const statusLabel = { new: "New", in_progress: "In progress", resolved: "Resolved", reopened: "Reopened" }

const nextStatus: Record<TicketStatus, TicketStatus | null> = {
  new: "in_progress",
  in_progress: "resolved",
  resolved: null,
  reopened: "in_progress",
}

const STALE_HOURS = 24
const MAX_AI_FLAG_BATCH = 30
const EMPTY_URGENT_FLAGS = new Map<string, string>()

export default function TicketQueue() {
  const draft = useTicketDraft()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all")

  const [reminders, setReminders] = useState<Map<string, Reminder>>(new Map())
  const [nudging, setNudging] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const ticketsRes = await api.get<{ tickets: Ticket[] }>(
        statusFilter === "all" ? "/api/tickets" : `/api/tickets?status=${statusFilter}`,
      )
      setTickets(ticketsRes.tickets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // Live-prepend a ticket created via the floating panel, even if it was
  // opened/saved while the admin was on a different page.
  useEffect(() => {
    function onCreated(e: Event) {
      const ticket = (e as CustomEvent<Ticket>).detail
      if (statusFilter === "all" || statusFilter === ticket.status) {
        setTickets((prev) => [ticket, ...prev])
      }
    }
    window.addEventListener(TICKET_CREATED_EVENT_NAME, onCreated)
    return () => window.removeEventListener(TICKET_CREATED_EVENT_NAME, onCreated)
  }, [statusFilter])

  useEffect(() => {
    listReminders("ticket")
      .then(({ reminders }) => setReminders(latestByTarget(reminders)))
      .catch(() => {})
  }, [tickets.length])

  // One batch AI call for stale open tickets — never one call per ticket, and
  // only once per visit (cached), not on every re-render or page revisit.
  const {
    data: urgentFlagsData,
    loading: urgentFlagsLoading,
    refresh: refreshUrgentFlags,
  } = useCachedFetch(
    "tickets-ai-priority-flags",
    async () => {
      const now = Date.now()
      const stale = tickets
        .filter((t) => t.status === "new" || t.status === "in_progress")
        .filter((t) => (now - new Date(t.created_at).getTime()) / 3_600_000 > STALE_HOURS)
        .slice(0, MAX_AI_FLAG_BATCH)

      if (stale.length === 0) return EMPTY_URGENT_FLAGS

      const { flags } = await api.post<{ flags: { id: string; urgent: boolean; reason: string }[] }>(
        "/api/tickets/ai-priority-flags",
        {
          tickets: stale.map((t) => ({
            id: t.id,
            category: t.category,
            description: t.description,
            age_hours: Math.round((now - new Date(t.created_at).getTime()) / 3_600_000),
          })),
        },
      )
      const map = new Map<string, string>()
      for (const f of flags) if (f.urgent) map.set(f.id, f.reason)
      return map
    },
    { enabled: !loading && tickets.length > 0 },
  )
  const urgentFlags = urgentFlagsData ?? EMPTY_URGENT_FLAGS

  async function advance(t: Ticket) {
    const to = nextStatus[t.status]
    if (!to) return
    try {
      const { ticket } = await api.patch<{ ticket: Ticket }>(`/api/tickets/${t.id}`, { status: to })
      setTickets((prev) => prev.map((x) => (x.id === t.id ? ticket : x)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket")
    }
  }

  async function nudge(t: Ticket, kind: "nudge_resident" | "nudge_staff") {
    setNudging(`${t.id}:${kind}`)
    try {
      const { reminder } = await queueReminder("ticket", t.id, kind)
      setReminders((prev) => new Map(prev).set(t.id, reminder))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue reminder")
    } finally {
      setNudging(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Ticket Queue"
        description="Complaints and requests, auto-converted from resident WhatsApp messages."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshUrgentFlags}
              disabled={urgentFlagsLoading}
              title="Re-check AI urgency flags"
              className="flex items-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-xs font-medium text-ink-500 hover:bg-paper-100 disabled:opacity-50"
            >
              <RotateCw size={13} className={urgentFlagsLoading ? "animate-spin" : undefined} />
              {urgentFlagsLoading ? "Checking…" : "Re-check urgency"}
            </button>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-44">
              <option value="all">All statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="reopened">Reopened</option>
            </Select>
            <Button onClick={draft.openNew}>
              <Plus size={16} /> New ticket
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card>
            <TableSkeleton rows={4} cols={1} />
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <EmptyState
              illustration={<NoTicketsIllustration />}
              title="No tickets here"
              description="Tickets created from resident WhatsApp messages will show up here automatically."
              action={
                <Button onClick={draft.openNew} variant="secondary">
                  <Plus size={16} /> New ticket
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const lastReminder = reminders.get(t.id)
              const urgentReason = urgentFlags.get(t.id)
              return (
                <Card key={t.id} className="p-5">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-ink-500">
                          {t.units ? `${t.units.block}-${t.units.unit_number}` : "—"}
                        </span>
                        <span className="text-sm font-semibold text-ink-900">{t.resident_name ?? "Unknown resident"}</span>
                        <span className="text-ink-200">·</span>
                        <span className="text-xs text-ink-500 capitalize">{t.category}</span>
                        <span className="text-ink-200">·</span>
                        <span className="text-xs text-ink-500">
                          {formatDate(t.created_at)} {formatTime(t.created_at)}
                        </span>
                        {urgentReason && (
                          <span
                            title={urgentReason}
                            className="inline-flex items-center gap-1 rounded-full border border-rust-200 bg-rust-50 px-2 py-0.5 text-[11px] font-medium text-rust-700"
                          >
                            <Sparkles size={10} /> AI: urgent
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-start gap-2 rounded-lg bg-paper-100 p-3">
                        <MessageCircle size={16} className="mt-0.5 shrink-0 text-stamp-600" />
                        <p className="text-sm text-ink-700">{t.original_message ?? t.description}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => nudge(t, "nudge_resident")}
                          disabled={nudging === `${t.id}:nudge_resident`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                        >
                          <BellRing size={12} /> Nudge resident
                        </button>
                        <button
                          type="button"
                          onClick={() => nudge(t, "nudge_staff")}
                          disabled={nudging === `${t.id}:nudge_staff`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:underline disabled:opacity-50"
                        >
                          <BellRing size={12} /> Nudge staff
                        </button>
                        {lastReminder && (
                          <span className="text-xs text-ink-400">Reminded {formatTimeAgo(lastReminder.created_at)}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Stamp tone={priorityTone[t.priority]}>{t.priority}</Stamp>
                      <Stamp tone={statusTone[t.status]}>{statusLabel[t.status]}</Stamp>
                      {nextStatus[t.status] && (
                        <button onClick={() => advance(t)} className="mt-1 text-xs font-medium text-ink-700 hover:underline">
                          {t.status === "new" ? "Mark in progress →" : "Mark resolved →"}
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
