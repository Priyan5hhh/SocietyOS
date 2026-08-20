import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  LogOut,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Users,
  Wallet,
  Clock,
  PauseCircle,
  PlayCircle,
  Trash2,
  CreditCard,
} from "lucide-react"
import { Card } from "@/components/ui/Card"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Button } from "@/components/ui/Button"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { Select } from "@/components/ui/Input"
import { StatTile } from "@/admin/components/StatTile"
import { useAuth } from "@/lib/auth-context"
import { errorMessage, formatDate, formatINR } from "@/lib/utils"
import { api } from "@/lib/services/api"

interface Plan {
  id: string
  name: string
  price_paise: number
  billing_cycle: "monthly" | "annual"
  unit_limit: number | null
  features: string[]
}

type SubscriptionStatus = "trialing" | "active" | "past_due" | "grace_period" | "suspended" | "cancelled"

interface Subscription {
  id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  reminder_days_before: number
  plans: Plan
}

const subStatusTone: Record<SubscriptionStatus, "stamp" | "amber" | "rust" | "ink"> = {
  trialing: "amber",
  active: "stamp",
  past_due: "rust",
  grace_period: "amber",
  suspended: "rust",
  cancelled: "ink",
}

interface SignupRequest {
  id: string
  society_name: string
  requester_name: string
  requester_email: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

interface Society {
  id: string
  name: string
  slug: string
  status: "active" | "suspended"
  created_at: string
  resident_count: number
  admin_name: string | null
  admin_email: string | null
  admin_phone: string | null
}

interface Stats {
  total_societies: number
  active_societies: number
  suspended_societies: number
  total_residents: number
  pending_requests: number
  total_revenue: number
}

const statusTone = { pending: "amber", approved: "stamp", rejected: "rust" } as const
const societyStatusTone = { active: "stamp", suspended: "rust" } as const

export default function PlatformAdmin() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [societies, setSocieties] = useState<Society[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Society | null>(null)
  const [confirmName, setConfirmName] = useState("")

  const [plans, setPlans] = useState<Plan[]>([])
  const [planTarget, setPlanTarget] = useState<Society | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [subLoading, setSubLoading] = useState(false)
  const [subSaving, setSubSaving] = useState(false)
  const [subForm, setSubForm] = useState({ plan_id: "", status: "active" as SubscriptionStatus, current_period_end: "" })

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [reqRes, socRes, statsRes] = await Promise.all([
        api.get<{ requests: SignupRequest[] }>("/api/platform/signup-requests"),
        api.get<{ societies: Society[] }>("/api/platform/societies"),
        api.get<Stats>("/api/platform/stats"),
      ])
      setRequests(reqRes.requests)
      setSocieties(socRes.societies)
      setStats(statsRes)
    } catch (err) {
      setError(errorMessage(err, "Failed to load platform data"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    api
      .get<{ plans: Plan[] }>("/api/platform/plans")
      .then(({ plans }) => setPlans(plans))
      .catch(() => {})
  }, [])

  async function openPlanManager(society: Society) {
    setPlanTarget(society)
    setSubLoading(true)
    setSubscription(null)
    try {
      const { subscription } = await api.get<{ subscription: Subscription }>(`/api/platform/societies/${society.id}/subscription`)
      setSubscription(subscription)
      setSubForm({
        plan_id: subscription.plan_id,
        status: subscription.status,
        current_period_end: subscription.current_period_end.slice(0, 10),
      })
    } catch (err) {
      setError(errorMessage(err, "Failed to load subscription"))
    } finally {
      setSubLoading(false)
    }
  }

  async function saveSubscription() {
    if (!planTarget) return
    setSubSaving(true)
    setError(null)
    try {
      const { subscription: updated } = await api.patch<{ subscription: Subscription }>(
        `/api/platform/societies/${planTarget.id}/subscription`,
        {
          plan_id: subForm.plan_id,
          status: subForm.status,
          current_period_end: new Date(subForm.current_period_end).toISOString(),
        },
      )
      setSubscription(updated)
      setPlanTarget(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to update subscription"))
    } finally {
      setSubSaving(false)
    }
  }

  async function approve(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/api/platform/signup-requests/${id}/approve`)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to approve"))
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/api/platform/signup-requests/${id}/reject`)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to reject"))
    } finally {
      setBusyId(null)
    }
  }

  async function toggleStatus(society: Society) {
    setBusyId(society.id)
    setError(null)
    try {
      const nextStatus = society.status === "active" ? "suspended" : "active"
      await api.patch(`/api/platform/societies/${society.id}`, { status: nextStatus })
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to update society status"))
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    setError(null)
    try {
      await api.delete(`/api/platform/societies/${deleteTarget.id}`)
      setDeleteTarget(null)
      setConfirmName("")
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to delete society"))
    } finally {
      setBusyId(null)
    }
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const pending = requests.filter((r) => r.status === "pending")
  const reviewed = requests.filter((r) => r.status !== "pending")

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="flex items-center justify-between border-b border-ink-100 bg-chrome-900 px-8 py-4">
        <span className="font-serif text-lg font-semibold text-white">Platform Admin</span>
        <button onClick={handleLogout} aria-label="Log out" className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white">
          <LogOut size={18} />
        </button>
      </header>

      <div className="mx-auto max-w-5xl p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card className="mb-8 p-6">
            <TableSkeleton rows={2} cols={4} />
          </Card>
        ) : (
          stats && (
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Societies"
                value={String(stats.total_societies)}
                hint={`${stats.active_societies} active · ${stats.suspended_societies} suspended`}
                icon={<Building2 size={18} />}
                tone="ink"
              />
              <StatTile
                label="Total residents"
                value={String(stats.total_residents)}
                icon={<Users size={18} />}
                tone="stamp"
              />
              <StatTile
                label="Pending requests"
                value={String(stats.pending_requests)}
                icon={<Clock size={18} />}
                tone="amber"
              />
              <StatTile
                label="Total revenue"
                value={formatINR(stats.total_revenue)}
                hint="captured payments, all societies"
                icon={<Wallet size={18} />}
                tone="stamp"
              />
            </div>
          )
        )}

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Pending society signups ({loading ? "…" : pending.length})
        </h2>

        {loading ? (
          <Card>
            <TableSkeleton rows={3} cols={2} />
          </Card>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No pending requests.</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-5">
                <div>
                  <div className="font-medium text-ink-900">{r.society_name}</div>
                  <div className="text-sm text-ink-500">
                    {r.requester_name} · {r.requester_email}
                  </div>
                  <div className="mt-1 text-xs text-ink-300">{formatDate(r.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={busyId === r.id} onClick={() => reject(r.id)}>
                    <XCircle size={16} /> Reject
                  </Button>
                  <Button type="button" disabled={busyId === r.id} onClick={() => approve(r.id)}>
                    <CheckCircle2 size={16} /> {busyId === r.id ? "Working…" : "Approve"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-500">Reviewed requests</h2>
            <div className="space-y-2">
              {reviewed.map((r) => (
                <Card key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium text-ink-900">{r.society_name}</div>
                    <div className="text-xs text-ink-500">
                      {r.requester_name} · {r.requester_email}
                    </div>
                  </div>
                  <Stamp tone={statusTone[r.status]}>{r.status}</Stamp>
                </Card>
              ))}
            </div>
          </>
        )}

        <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-500">
          All societies ({loading ? "…" : societies.length})
        </h2>

        {loading ? (
          <Card>
            <TableSkeleton rows={3} cols={3} />
          </Card>
        ) : societies.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No societies yet.</Card>
        ) : (
          <div className="space-y-3">
            {societies.map((s) => (
              <Card key={s.id} className="flex items-center justify-between p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-900">{s.name}</span>
                    <Stamp tone={societyStatusTone[s.status]}>{s.status}</Stamp>
                  </div>
                  <div className="mt-1 text-sm text-ink-500">
                    {s.admin_name ? `${s.admin_name} · ${s.admin_email}` : "No admin on record"}
                  </div>
                  <div className="mt-1 text-xs text-ink-300">
                    {s.resident_count} residents · created {formatDate(s.created_at)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openPlanManager(s)}
                    title="Manage subscription"
                  >
                    <CreditCard size={16} /> Plan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyId === s.id}
                    onClick={() => toggleStatus(s)}
                    title={s.status === "active" ? "Suspend" : "Reactivate"}
                  >
                    {s.status === "active" ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                    {s.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busyId === s.id}
                    onClick={() => {
                      setDeleteTarget(s)
                      setConfirmName("")
                    }}
                    title="Delete permanently"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null)
          setConfirmName("")
        }}
        title="Delete society permanently"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              This permanently deletes <strong>{deleteTarget.name}</strong> and everything tied to it — residents, units,
              tickets, billing history, and every staff login. This cannot be undone.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">
                Type <span className="font-mono font-semibold text-ink-900">{deleteTarget.name}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-rust-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null)
                  setConfirmName("")
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={confirmName !== deleteTarget.name || busyId === deleteTarget.id}
                onClick={confirmDelete}
              >
                <Trash2 size={16} /> {busyId === deleteTarget.id ? "Deleting…" : "Delete permanently"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={planTarget !== null} onClose={() => setPlanTarget(null)} title={planTarget ? `Subscription — ${planTarget.name}` : "Subscription"}>
        {subLoading ? (
          <TableSkeleton rows={3} cols={1} />
        ) : subscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-500">Current status</span>
              <Stamp tone={subStatusTone[subscription.status]}>{subscription.status.replace("_", " ")}</Stamp>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Plan</label>
              <Select value={subForm.plan_id} onChange={(e) => setSubForm({ ...subForm, plan_id: e.target.value })}>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.price_paise / 100)}/{p.billing_cycle === "monthly" ? "mo" : "yr"}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Status</label>
              <Select value={subForm.status} onChange={(e) => setSubForm({ ...subForm, status: e.target.value as SubscriptionStatus })}>
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past due</option>
                <option value="grace_period">Grace period</option>
                <option value="suspended">Suspended</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Renews / expires on</label>
              <input
                type="date"
                value={subForm.current_period_end}
                onChange={(e) => setSubForm({ ...subForm, current_period_end: e.target.value })}
                className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm focus:border-stamp-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setPlanTarget(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={saveSubscription} disabled={subSaving}>
                {subSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-500">No subscription on file for this society yet.</p>
        )}
      </Modal>
    </div>
  )
}
