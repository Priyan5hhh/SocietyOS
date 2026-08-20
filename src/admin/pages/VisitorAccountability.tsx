import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Phone, UserCheck, Clock } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { NoVisitorsIllustration } from "@/components/illustrations"
import { formatDate, formatTime } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { getStaffSupabase } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface Visitor {
  id: string
  name: string
  phone: string
  purpose: string
  pre_approved: boolean
  check_in_at: string
  check_out_at: string | null
  units: { block: string; unit_number: string } | null
  logged_by: { id: string; name: string } | null
}

interface Guard {
  id: string
  name: string
  role: string
  active: boolean
}

const purposeLabel: Record<string, string> = {
  guest: "Guest",
  delivery: "Delivery",
  cab: "Cab / Auto",
  service: "Service",
  other: "Other",
}

const RANGE_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "", label: "All time" },
]

interface PreApproval {
  id: string
  guest_name: string
  guest_phone: string | null
  valid_until: string
  units: { block: string; unit_number: string } | null
}

export default function VisitorAccountability() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [guards, setGuards] = useState<Guard[]>([])
  const [preApprovals, setPreApprovals] = useState<PreApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [guardFilter, setGuardFilter] = useState("all")
  const [rangeDays, setRangeDays] = useState("7")

  useEffect(() => {
    api
      .get<{ staff: Guard[] }>("/api/staff")
      .then(({ staff }) => setGuards(staff.filter((s) => s.role === "guard")))
      .catch(() => {})

    getStaffSupabase()
      .from("pre_approvals")
      .select("id, guest_name, guest_phone, valid_until, units(block, unit_number)")
      .eq("consumed", false)
      .gt("valid_until", new Date().toISOString())
      .order("valid_until", { ascending: true })
      .then(
        ({ data }) => setPreApprovals((data ?? []) as unknown as PreApproval[]),
        () => {},
      )
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (guardFilter !== "all") params.set("guard_id", guardFilter)
    if (rangeDays) {
      const since = new Date(Date.now() - Number(rangeDays) * 86_400_000).toISOString()
      params.set("since", since)
    }
    api
      .get<{ visitors: Visitor[] }>(`/api/visitors?${params.toString()}`)
      .then(({ visitors }) => setVisitors(visitors))
      .catch((err) => setError(errorMessage(err, "Failed to load visitor log")))
      .finally(() => setLoading(false))
  }, [guardFilter, rangeDays])

  // Per-guard tally for the range currently in view — the accountability
  // summary a manager actually wants at a glance, not just a flat list.
  const byGuard = useMemo(() => {
    const counts = new Map<string, { name: string; total: number; denied: number }>()
    for (const v of visitors) {
      const key = v.logged_by?.id ?? "unknown"
      const entry = counts.get(key) ?? { name: v.logged_by?.name ?? "Unknown", total: 0, denied: 0 }
      entry.total += 1
      counts.set(key, entry)
    }
    return [...counts.values()].sort((a, b) => b.total - a.total)
  }, [visitors])

  return (
    <div>
      <PageHeader
        title="Visitor Accountability"
        description="Every gate entry, attributed to the guard who logged it."
        action={
          <div className="flex items-center gap-3">
            <Select value={guardFilter} onChange={(e) => setGuardFilter(e.target.value)} className="w-48">
              <option value="all">All guards</option>
              {guards.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            <Select value={rangeDays} onChange={(e) => setRangeDays(e.target.value)} className="w-40">
              {RANGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
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

        {preApprovals.length > 0 && (
          <Card className="mb-5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-900">
              <UserCheck size={16} className="text-stamp-600" /> Pending guest pre-approvals ({preApprovals.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {preApprovals.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-md border border-stamp-200 bg-stamp-50 px-2.5 py-1.5 text-xs">
                  <span className="font-medium">{p.guest_name}</span>
                  {p.units && <span className="font-mono text-ink-500">{p.units.block}-{p.units.unit_number}</span>}
                  <span className="flex items-center gap-1 text-ink-400">
                    <Clock size={11} /> until {formatDate(p.valid_until)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!loading && byGuard.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-3">
            {byGuard.map((g) => (
              <Card key={g.name} className="px-4 py-3">
                <div className="text-xs font-medium text-ink-500">{g.name}</div>
                <div className="mt-0.5 text-xl font-semibold text-ink-900">{g.total}</div>
                <div className="text-[11px] text-ink-400">entries logged</div>
              </Card>
            ))}
          </div>
        )}

        <Card>
          {loading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : visitors.length === 0 ? (
            <EmptyState
              illustration={<NoVisitorsIllustration />}
              title="No visitor entries in this range"
              description="Try a wider date range or a different guard."
            />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Visitor</Th>
                  <Th>Unit</Th>
                  <Th>Purpose</Th>
                  <Th>Logged by</Th>
                  <Th>Checked in</Th>
                  <Th>Checked out</Th>
                </tr>
              </Thead>
              <Tbody>
                {visitors.map((v) => (
                  <Tr key={v.id}>
                    <Td>
                      <div className="font-medium">{v.name}</div>
                      <div className="flex items-center gap-1 text-xs text-ink-500">
                        <Phone size={11} /> {v.phone}
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">
                      {v.units ? `${v.units.block}-${v.units.unit_number}` : "—"}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{purposeLabel[v.purpose] ?? v.purpose}</span>
                        {v.pre_approved && <Stamp tone="stamp">Pre-approved</Stamp>}
                      </div>
                    </Td>
                    <Td className="font-medium">{v.logged_by?.name ?? "—"}</Td>
                    <Td className="text-ink-500">
                      {formatDate(v.check_in_at)} {formatTime(v.check_in_at)}
                    </Td>
                    <Td className="text-ink-500">
                      {v.check_out_at ? (
                        formatTime(v.check_out_at)
                      ) : (
                        <Stamp tone="amber">On premises</Stamp>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
