import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, AlertCircle, Download, BellRing } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate, formatINR } from "@/lib/utils"
import { getStaffSupabase } from "@/lib/services/supabase"
import { queueBulkReminders } from "@/lib/reminders"
import { errorMessage } from "@/lib/utils"

interface Defaulter {
  society_id: string
  unit_id: string
  block: string
  unit_number: string
  overdue_count: number
  total_overdue: number
  oldest_due_date: string
  max_ageing_days: number
}

function ageingBucket(days: number) {
  if (days <= 30) return "0-30"
  if (days <= 60) return "30-60"
  return "60+"
}

const bucketTone: Record<string, "amber" | "rust"> = { "0-30": "amber", "30-60": "rust", "60+": "rust" }

function toCsv(rows: Defaulter[]) {
  const header = ["Unit", "Overdue count", "Total overdue", "Oldest due date", "Ageing (days)", "Bucket"]
  const body = rows.map((r) => [
    `${r.block}-${r.unit_number}`,
    r.overdue_count,
    r.total_overdue.toFixed(2),
    r.oldest_due_date,
    r.max_ageing_days,
    ageingBucket(r.max_ageing_days),
  ])
  return [header, ...body].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Defaulter report (item 10) — reads the `defaulters` SQL view (rollup of
 * overdue `dues` per unit), filterable by ageing bucket, with CSV export and
 * a bulk-remind action reusing Billing.tsx's existing reminder queue helper.
 */
export default function Defaulters() {
  const [rows, setRows] = useState<Defaulter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [bucket, setBucket] = useState("")
  const [reminding, setReminding] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: qErr } = await sb.from("defaulters").select("*").order("total_overdue", { ascending: false })
      if (qErr) throw qErr
      setRows((data ?? []) as Defaulter[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load defaulters"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(
    () => (bucket ? rows.filter((r) => ageingBucket(r.max_ageing_days) === bucket) : rows),
    [rows, bucket],
  )

  const totalOverdue = useMemo(() => filtered.reduce((sum, r) => sum + Number(r.total_overdue), 0), [filtered])

  async function remindAll() {
    setReminding(true)
    setNote(null)
    try {
      const sb = getStaffSupabase()
      const { data: duesData, error: dErr } = await sb
        .from("dues")
        .select("id, unit_id")
        .eq("status", "overdue")
        .in("unit_id", filtered.map((r) => r.unit_id))
      if (dErr) throw dErr
      const dueIds = (duesData ?? []).map((d: { id: string }) => d.id)
      if (dueIds.length === 0) {
        setNote("No overdue dues to remind.")
        return
      }
      const { count } = await queueBulkReminders("due", dueIds, "payment_reminder")
      setNote(`Queued ${count} reminder${count === 1 ? "" : "s"}.`)
    } catch (err) {
      setNote(errorMessage(err, "Failed to queue reminders"))
    } finally {
      setReminding(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Defaulters"
        description="Units with overdue dues, ranked by amount — the treasurer's monthly pre-meeting view."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadCsv("defaulters.csv", toCsv(filtered))} disabled={filtered.length === 0}>
              <Download size={16} /> Export CSV
            </Button>
            <Button onClick={remindAll} disabled={reminding || filtered.length === 0}>
              <BellRing size={16} /> {reminding ? "Queuing…" : "Remind all"}
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
        {note && <p className="mb-4 text-sm text-ink-500">{note}</p>}

        <div className="mb-4 flex items-center gap-4">
          <div className="max-w-xs flex-1">
            <Select value={bucket} onChange={(e) => setBucket(e.target.value)}>
              <option value="">All ageing buckets</option>
              <option value="0-30">0-30 days</option>
              <option value="30-60">30-60 days</option>
              <option value="60+">60+ days</option>
            </Select>
          </div>
          <div className="text-sm text-ink-500">
            {filtered.length} unit{filtered.length === 1 ? "" : "s"} · <span className="font-mono font-semibold text-rust-700">{formatINR(totalOverdue)}</span> total overdue
          </div>
        </div>

        {loading ? (
          <Card>
            <TableSkeleton rows={5} cols={5} />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <AlertTriangle size={24} className="mx-auto mb-2 text-ink-300" />
            No defaulters — every unit is current.
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Overdue units</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>Unit</Th>
                    <Th>Overdue dues</Th>
                    <Th>Total overdue</Th>
                    <Th>Oldest due</Th>
                    <Th>Ageing</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {filtered.map((r) => (
                    <Tr key={r.unit_id}>
                      <Td className="font-mono text-xs">{r.block}-{r.unit_number}</Td>
                      <Td>{r.overdue_count}</Td>
                      <Td className="font-mono font-medium text-rust-700">{formatINR(r.total_overdue)}</Td>
                      <Td className="text-ink-500">{formatDate(r.oldest_due_date)}</Td>
                      <Td>
                        <Stamp tone={bucketTone[ageingBucket(r.max_ageing_days)]}>{ageingBucket(r.max_ageing_days)}d · {r.max_ageing_days}d</Stamp>
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
