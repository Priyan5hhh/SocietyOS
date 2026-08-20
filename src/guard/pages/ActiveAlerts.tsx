import { useCallback, useEffect, useState } from "react"
import { Siren, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Stamp } from "@/components/ui/Stamp"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatTimeAgo, formatDate } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface SosAlert {
  id: string
  resident_name: string | null
  unit_label: string | null
  status: "active" | "acknowledged" | "resolved"
  raised_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  note: string | null
}

const statusTone = { active: "rust", acknowledged: "amber", resolved: "stamp" } as const
const statusLabel = { active: "Active", acknowledged: "Acknowledged", resolved: "Resolved" } as const

const POLL_MS = 8000

/**
 * Guard/admin "Active Alerts" — resident "Alert security desk" taps land
 * here. This is an internal in-app signal only (see ResidentHome.tsx /
 * sos_alerts table comments) — no hardware, no real emergency dispatch.
 * Polls sos_alerts every 8s for a real-time-ish feed (simplest reliable
 * option given the resident app also uses polling rather than a live
 * Supabase Realtime subscription).
 */
export default function ActiveAlerts() {
  const [alerts, setAlerts] = useState<SosAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: qErr } = await sb
        .from("sos_alerts")
        .select("id, resident_name, unit_label, status, raised_at, acknowledged_at, resolved_at, note")
        .neq("status", "resolved")
        .order("raised_at", { ascending: false })
      if (qErr) throw qErr
      setAlerts((data ?? []) as SosAlert[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load alerts"))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), POLL_MS)
    return () => clearInterval(interval)
  }, [load])

  async function acknowledge(id: string) {
    setBusyId(id)
    try {
      const sb = getStaffSupabase()
      const { staffId } = getStaffClaims()
      const { error: uErr } = await sb
        .from("sos_alerts")
        .update({ status: "acknowledged", acknowledged_by_staff_id: staffId, acknowledged_at: new Date().toISOString() })
        .eq("id", id)
      if (uErr) throw uErr
      await load(true)
    } catch (err) {
      setError(errorMessage(err, "Failed to acknowledge"))
    } finally {
      setBusyId(null)
    }
  }

  async function resolve(id: string) {
    setBusyId(id)
    try {
      const sb = getStaffSupabase()
      const { error: uErr } = await sb
        .from("sos_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id)
      if (uErr) throw uErr
      setAlerts((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      setError(errorMessage(err, "Failed to resolve"))
    } finally {
      setBusyId(null)
    }
  }

  const activeCount = alerts.filter((a) => a.status === "active").length

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-xl font-semibold text-ink-900">
            <Siren size={20} className="text-rust-600" /> Active Alerts
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Residents who tapped "Alert security desk". In-app signal only — not a call to emergency services.
          </p>
        </div>
        {activeCount > 0 && <Stamp tone="rust">{activeCount} active</Stamp>}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
      ) : alerts.length === 0 ? (
        <Card>
          <EmptyState
            illustration={<ShieldCheck size={40} className="text-ink-200" />}
            title="No active alerts"
            description="Nothing pending right now. New alerts appear here automatically."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={a.status === "active" ? "border-rust-300 p-4" : "p-4"}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {a.resident_name ?? "Unknown resident"}
                      {a.unit_label ? ` · ${a.unit_label}` : ""}
                    </span>
                    <Stamp tone={statusTone[a.status]}>{statusLabel[a.status]}</Stamp>
                  </div>
                  <div className="mt-1 text-xs text-ink-500">
                    Raised {formatTimeAgo(a.raised_at)} · {formatDate(a.raised_at)}
                    {a.acknowledged_at && ` · acknowledged ${formatTimeAgo(a.acknowledged_at)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {a.status === "active" && (
                    <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => acknowledge(a.id)}>
                      Acknowledge
                    </Button>
                  )}
                  <Button size="sm" disabled={busyId === a.id} onClick={() => resolve(a.id)}>
                    <CheckCircle2 size={14} /> Resolve
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
