import { useEffect, useMemo, useState } from "react"
import { Phone, LogOut as ExitIcon, AlertCircle, AlertTriangle } from "lucide-react"
import { Avatar } from "@/components/ui/Avatar"
import { Stamp } from "@/components/ui/Stamp"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { NoVisitorsIllustration } from "@/components/illustrations"
import { formatTime } from "@/lib/utils"
import { api } from "@/lib/services/api"

interface Visitor {
  id: string
  name: string
  phone: string
  purpose: string
  photo_imagekit_url: string | null
  pre_approved: boolean
  check_in_at: string
  check_out_at: string | null
  units: { block: string; unit_number: string } | null
}

const purposeLabel: Record<string, string> = {
  guest: "Guest",
  delivery: "Delivery",
  cab: "Cab / Auto",
  service: "Service",
  other: "Other",
}

export default function VisitorLog() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { visitors } = await api.get<{ visitors: Visitor[] }>("/api/visitors?today=true")
      setVisitors(visitors)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load visitors")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function checkOut(id: string) {
    try {
      const { visitor } = await api.post<{ visitor: Visitor }>(`/api/visitors/${id}/checkout`)
      setVisitors((prev) => prev.map((v) => (v.id === id ? visitor : v)))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check out visitor")
    }
  }

  const today = [...visitors].sort((a, b) => b.check_in_at.localeCompare(a.check_in_at))

  // Deterministic (not AI) pattern check: same phone at 3+ different units
  // today is unusual enough to flag at a glance — instant, no AI call needed.
  const unusualPhones = useMemo(() => {
    const unitsByPhone = new Map<string, Set<string>>()
    for (const v of visitors) {
      const key = v.units ? `${v.units.block}-${v.units.unit_number}` : null
      if (!key) continue
      const set = unitsByPhone.get(v.phone) ?? new Set<string>()
      set.add(key)
      unitsByPhone.set(v.phone, set)
    }
    return new Set([...unitsByPhone.entries()].filter(([, units]) => units.size >= 3).map(([phone]) => phone))
  }, [visitors])

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-semibold text-ink-900">Today's visitors</h1>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={1} />
      ) : today.length === 0 ? (
        <EmptyState
          illustration={<NoVisitorsIllustration />}
          title="No visitors yet"
          description="Entries you log at the gate will show up here."
        />
      ) : (
        <div className="space-y-3">
          {today.map((v) => (
            <div key={v.id} className="rounded-xl border border-ink-100 bg-paper-0 p-4">
              <div className="flex items-start gap-3">
                <Avatar name={v.name} photoUrl={v.photo_imagekit_url} className="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-ink-900">{v.name}</span>
                    {v.pre_approved && <Stamp tone="stamp">Pre-approved</Stamp>}
                  </div>
                  {unusualPhones.has(v.phone) && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
                      <AlertTriangle size={12} /> Unusual pattern — this number visited 3+ units today
                    </div>
                  )}
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
                    <Phone size={14} />
                    {v.phone}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span className="rounded bg-paper-100 px-2 py-0.5 font-medium">{purposeLabel[v.purpose]}</span>
                    {v.units && <span className="font-mono">{v.units.block}-{v.units.unit_number}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3 text-xs text-ink-500">
                <span>In: {formatTime(v.check_in_at)}</span>
                {v.check_out_at ? (
                  <span className="flex items-center gap-1">
                    <ExitIcon size={14} /> Out: {formatTime(v.check_out_at)}
                  </span>
                ) : (
                  <button onClick={() => checkOut(v.id)}>
                    <Stamp tone="amber">On premises · tap to check out</Stamp>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
