import { Fragment, useEffect, useMemo, useState } from "react"
import { ScrollText, AlertCircle, ChevronDown, ChevronRight } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Select, Input } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate, formatTime } from "@/lib/utils"
import { getStaffSupabase } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface AuditRow {
  id: string
  actor_staff_id: string | null
  actor_type: "staff" | "system" | "ai"
  action: string
  entity_type: string
  entity_id: string
  before: unknown
  after: unknown
  created_at: string
}

const actorTone = { staff: "stamp", system: "ink", ai: "amber" } as const

/**
 * Audit log screen (item 12) — read-only view over the already-populated
 * `audit_log` table. Filters by entity type / actor type / date; each row
 * expands to a before/after JSON diff (the rows are already shaped for it).
 */
export default function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityType, setEntityType] = useState("")
  const [actorType, setActorType] = useState("")
  const [since, setSince] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      let query = sb.from("audit_log").select("*").order("created_at", { ascending: false }).limit(500)
      if (entityType) query = query.eq("entity_type", entityType)
      if (actorType) query = query.eq("actor_type", actorType)
      if (since) query = query.gte("created_at", new Date(since).toISOString())
      const { data, error: qErr } = await query
      if (qErr) throw qErr
      setRows((data ?? []) as AuditRow[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load audit log"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, actorType, since])

  const entityTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.entity_type))).sort(), [rows])

  return (
    <div>
      <PageHeader title="Audit Log" description="Every recorded staff/system/AI action on this society's data — filterable and read-only." />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All entity types</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={actorType} onChange={(e) => setActorType(e.target.value)}>
            <option value="">All actors</option>
            <option value="staff">Staff</option>
            <option value="system">System</option>
            <option value="ai">AI</option>
          </Select>
          <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} />
        </div>

        {loading ? (
          <Card>
            <TableSkeleton rows={6} cols={5} />
          </Card>
        ) : rows.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <ScrollText size={24} className="mx-auto mb-2 text-ink-300" />
            No audit entries match these filters.
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entries ({rows.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <Thead>
                  <tr>
                    <Th></Th>
                    <Th>When</Th>
                    <Th>Actor</Th>
                    <Th>Action</Th>
                    <Th>Entity</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Fragment key={r.id}>
                      <Tr className="cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                        <Td className="w-6">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</Td>
                        <Td className="text-ink-500">
                          {formatDate(r.created_at)} {formatTime(r.created_at)}
                        </Td>
                        <Td>
                          <Stamp tone={actorTone[r.actor_type]}>{r.actor_type}</Stamp>
                        </Td>
                        <Td className="font-mono text-xs">{r.action}</Td>
                        <Td className="text-xs text-ink-500">
                          {r.entity_type} · {r.entity_id.slice(0, 8)}
                        </Td>
                      </Tr>
                      {expanded === r.id && (
                        <Tr>
                          <Td colSpan={5}>
                            <div className="grid grid-cols-2 gap-3 rounded-md bg-paper-50 p-3 text-xs">
                              <div>
                                <div className="mb-1 font-semibold text-ink-500">Before</div>
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2">
                                  {r.before ? JSON.stringify(r.before, null, 2) : "—"}
                                </pre>
                              </div>
                              <div>
                                <div className="mb-1 font-semibold text-ink-500">After</div>
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-white p-2">
                                  {r.after ? JSON.stringify(r.after, null, 2) : "—"}
                                </pre>
                              </div>
                            </div>
                          </Td>
                        </Tr>
                      )}
                    </Fragment>
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
