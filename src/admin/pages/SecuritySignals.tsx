import { useEffect, useState } from "react"
import { ShieldAlert, AlertCircle, RotateCw, CheckCircle2, XCircle } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatDate, formatTimeAgo } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface SecurityFlag {
  id: string
  flag_type: string
  visitor_phone: string
  unit_ids: string[]
  visitor_ids: string[]
  window_days: number
  status: "open" | "reviewed" | "dismissed"
  reviewed_at: string | null
  detected_at: string
}

interface UnitLabel {
  id: string
  block: string
  unit_number: string
}

const statusTone = { open: "rust", reviewed: "stamp", dismissed: "ink" } as const

/**
 * Security / fraud signal review (item 08). No existing detection anywhere —
 * `refresh_security_flags` (Supabase RPC) runs the cross-unit-visitor query
 * on demand and upserts `security_flags`. Admin reviews/dismisses; every
 * action is written to `audit_log` server-side by the RPC (dogfoods item 12).
 */
export default function SecuritySignals() {
  const [flags, setFlags] = useState<SecurityFlag[]>([])
  const [units, setUnits] = useState<Map<string, UnitLabel>>(new Map())
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const [{ data: flagData, error: fErr }, { data: unitData, error: uErr }] = await Promise.all([
        sb.from("security_flags").select("*").order("status", { ascending: true }).order("detected_at", { ascending: false }),
        sb.from("units").select("id, block, unit_number").eq("society_id", societyId ?? ""),
      ])
      if (fErr) throw fErr
      if (uErr) throw uErr
      setFlags((flagData ?? []) as SecurityFlag[])
      setUnits(new Map((unitData ?? []).map((u: UnitLabel) => [u.id, u])))
    } catch (err) {
      setError(errorMessage(err, "Failed to load security signals"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function runScan() {
    setScanning(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const { error: rpcError } = await sb.rpc("refresh_security_flags", { p_society_id: societyId })
      if (rpcError) throw rpcError
      await load()
    } catch (err) {
      setError(errorMessage(err, "Scan failed"))
    } finally {
      setScanning(false)
    }
  }

  async function review(flag: SecurityFlag, status: "reviewed" | "dismissed") {
    setBusyId(flag.id)
    try {
      const sb = getStaffSupabase()
      const { error: rpcError } = await sb.rpc("review_security_flag", { p_flag_id: flag.id, p_status: status })
      if (rpcError) throw rpcError
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to update flag"))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Security Signals"
        description="Automated fraud/security signal review — visitors flagged for suspicious cross-unit patterns."
        action={
          <Button onClick={runScan} disabled={scanning}>
            <RotateCw size={16} className={scanning ? "animate-spin" : ""} /> {scanning ? "Scanning…" : "Run scan"}
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

        <Card className="mb-4 p-4 text-xs text-ink-500">
          Detects visitors whose phone number was logged at 3 or more distinct units within a 30-day rolling window —
          a common tell-through pattern (same "guest" visiting multiple flats) worth a human look. Run the scan any
          time to refresh; a nightly job can call the same RPC later.
        </Card>

        {loading ? (
          <Card>
            <TableSkeleton rows={4} cols={4} />
          </Card>
        ) : flags.length === 0 ? (
          <EmptyState
            illustration={<ShieldAlert size={40} className="text-ink-300" />}
            title="No signals detected"
            description="Run a scan to check for cross-unit visitor patterns."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert size={16} /> Flags
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>Phone</Th>
                    <Th>Units visited</Th>
                    <Th>Window</Th>
                    <Th>Detected</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {flags.map((f) => (
                    <Tr key={f.id}>
                      <Td className="font-mono text-xs">{f.visitor_phone}</Td>
                      <Td className="text-xs">
                        {f.unit_ids
                          .map((id) => {
                            const u = units.get(id)
                            return u ? `${u.block}-${u.unit_number}` : id.slice(0, 8)
                          })
                          .join(", ")}
                      </Td>
                      <Td className="text-ink-500">{f.window_days}d</Td>
                      <Td className="text-ink-500">{formatTimeAgo(f.detected_at)}</Td>
                      <Td>
                        <Stamp tone={statusTone[f.status]}>{f.status}</Stamp>
                      </Td>
                      <Td>
                        {f.status === "open" ? (
                          <div className="flex gap-3">
                            <button
                              type="button"
                              disabled={busyId === f.id}
                              onClick={() => review(f, "reviewed")}
                              className="inline-flex items-center gap-1 text-xs font-medium text-stamp-700 hover:underline disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Mark reviewed
                            </button>
                            <button
                              type="button"
                              disabled={busyId === f.id}
                              onClick={() => review(f, "dismissed")}
                              className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:underline disabled:opacity-50"
                            >
                              <XCircle size={12} /> Dismiss
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-400">{f.reviewed_at ? formatDate(f.reviewed_at) : "—"}</span>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
