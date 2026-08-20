import { useEffect, useMemo, useState } from "react"
import { BookOpen, AlertCircle, RotateCw, Download } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate, formatINR } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface LedgerEntry {
  id: string
  unit_id: string
  entry_type: "due" | "payment" | "late_fee" | "credit_note" | "adjustment"
  amount: number
  description: string
  balance_after: number
  created_at: string
}

interface UnitLabel {
  id: string
  block: string
  unit_number: string
}

const entryTone: Record<string, string> = {
  due: "text-ink-900",
  late_fee: "text-rust-700",
  payment: "text-stamp-700",
  credit_note: "text-stamp-700",
  adjustment: "text-amber-700",
}

function toTallyCsv(entries: LedgerEntry[], units: Map<string, UnitLabel>) {
  const header = ["Date", "Voucher Type", "Ledger Name", "Amount", "Narration"]
  const rows = entries.map((e) => {
    const u = units.get(e.unit_id)
    const ledgerName = u ? `Unit ${u.block}-${u.unit_number}` : e.unit_id
    const voucherType = e.entry_type === "payment" ? "Receipt" : e.entry_type === "late_fee" ? "Debit Note" : "Journal"
    return [e.created_at.slice(0, 10), voucherType, ledgerName, e.amount.toFixed(2), e.description]
  })
  return [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
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
 * Ledger view (item 09) — per-unit running balance over `ledger_entries`,
 * plus a Tally-format CSV export (date / voucher type / ledger name / amount
 * / narration), matching how ADDA itself interchanges with Tally (Excel/CSV
 * import, no live Tally API). `rebuild_ledger` recomputes entries from the
 * existing dues/payments tables on demand.
 */
export default function Ledger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [units, setUnits] = useState<Map<string, UnitLabel>>(new Map())
  const [loading, setLoading] = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unitFilter, setUnitFilter] = useState("")

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const [{ data: entryData, error: eErr }, { data: unitData, error: uErr }] = await Promise.all([
        sb.from("ledger_entries").select("*").order("created_at", { ascending: false }).limit(1000),
        sb.from("units").select("id, block, unit_number").eq("society_id", societyId ?? ""),
      ])
      if (eErr) throw eErr
      if (uErr) throw uErr
      setEntries((entryData ?? []) as LedgerEntry[])
      setUnits(new Map((unitData ?? []).map((u: UnitLabel) => [u.id, u])))
    } catch (err) {
      setError(errorMessage(err, "Failed to load ledger"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function rebuild() {
    setRebuilding(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const { error: rpcError } = await sb.rpc("rebuild_ledger", { p_society_id: societyId })
      if (rpcError) throw rpcError
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to rebuild ledger"))
    } finally {
      setRebuilding(false)
    }
  }

  const filtered = useMemo(
    () => (unitFilter ? entries.filter((e) => e.unit_id === unitFilter) : entries),
    [entries, unitFilter],
  )

  const balances = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) {
      if (!map.has(e.unit_id)) map.set(e.unit_id, e.balance_after)
    }
    return map
  }, [entries])

  return (
    <div>
      <PageHeader
        title="Ledger"
        description="Per-unit financial ledger, built from dues and payments."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadCsv("ledger-tally-export.csv", toTallyCsv(filtered, units))} disabled={filtered.length === 0}>
              <Download size={16} /> Export for Tally
            </Button>
            <Button onClick={rebuild} disabled={rebuilding}>
              <RotateCw size={16} className={rebuilding ? "animate-spin" : ""} /> {rebuilding ? "Rebuilding…" : "Rebuild ledger"}
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

        {balances.size > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from(balances.entries()).slice(0, 8).map(([unitId, bal]) => {
              const u = units.get(unitId)
              return (
                <Card key={unitId} className="p-3">
                  <div className="text-xs text-ink-500">{u ? `${u.block}-${u.unit_number}` : unitId.slice(0, 8)}</div>
                  <div className={`font-mono text-sm font-semibold ${bal > 0 ? "text-rust-700" : "text-stamp-700"}`}>{formatINR(bal)}</div>
                </Card>
              )
            })}
          </div>
        )}

        <div className="mb-4 max-w-xs">
          <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">All units</option>
            {Array.from(units.values()).map((u) => (
              <option key={u.id} value={u.id}>
                {u.block}-{u.unit_number}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <Card>
            <TableSkeleton rows={6} cols={5} />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <BookOpen size={24} className="mx-auto mb-2 text-ink-300" />
            No ledger entries yet — click "Rebuild ledger" to generate them from existing dues/payments.
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Entries</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Unit</Th>
                    <Th>Type</Th>
                    <Th>Description</Th>
                    <Th>Amount</Th>
                    <Th>Balance</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {filtered.map((e) => {
                    const u = units.get(e.unit_id)
                    return (
                      <Tr key={e.id}>
                        <Td className="text-ink-500">{formatDate(e.created_at)}</Td>
                        <Td className="font-mono text-xs">{u ? `${u.block}-${u.unit_number}` : "—"}</Td>
                        <Td className="text-xs capitalize">{e.entry_type.replace("_", " ")}</Td>
                        <Td className="text-ink-500">{e.description}</Td>
                        <Td className={`font-mono ${entryTone[e.entry_type]}`}>
                          {e.amount >= 0 ? "+" : ""}
                          {formatINR(e.amount)}
                        </Td>
                        <Td className="font-mono font-medium">{formatINR(e.balance_after)}</Td>
                      </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
