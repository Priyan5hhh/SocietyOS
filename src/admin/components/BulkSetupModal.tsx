import { useRef, useState } from "react"
import { read, utils } from "xlsx"
import { Sparkles, Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { Label, Select, Textarea } from "@/components/ui/Input"
import { api } from "@/lib/services/api"
import { errorMessage } from "@/lib/utils"

interface Mapping {
  name: string | null
  phone: string | null
  block: string | null
  unit_number: string | null
  combined_unit: string | null
  is_owner: string | null
  members_count: string | null
}

const MAPPING_FIELDS: { key: keyof Mapping; label: string; required: boolean }[] = [
  { key: "name", label: "Resident name", required: true },
  { key: "phone", label: "Phone", required: true },
  { key: "block", label: "Block", required: false },
  { key: "unit_number", label: "Unit number", required: false },
  { key: "combined_unit", label: "Combined unit (e.g. \"A-402\")", required: false },
  { key: "is_owner", label: "Owner / Tenant", required: false },
  { key: "members_count", label: "Household members", required: false },
]

/**
 * Splits a combined "Block-Unit" cell (e.g. "A-402", "Tower 1-201") apart.
 * Block names can contain spaces ("Tower 1"), so a plain regex can't tell
 * where the block ends and the unit number begins on its own — it'd split
 * "Tower 1-201" into block "Tower", unit "1-201". Knowing the society's
 * ALREADY-CREATED block names (from the AI range step, or existing units)
 * resolves that ambiguity: try the longest known block name that's a
 * prefix of the cell first, and only fall back to the naive regex split
 * for a society with no blocks set up yet.
 */
function splitCombinedUnit(value: string, knownBlocks: string[]): { block: string; unit_number: string } {
  const trimmed = value.trim()
  const sortedBlocks = [...knownBlocks].sort((a, b) => b.length - a.length)
  for (const block of sortedBlocks) {
    if (trimmed.toLowerCase().startsWith(block.toLowerCase())) {
      const rest = trimmed.slice(block.length).replace(/^[\s-]+/, "")
      if (rest) return { block, unit_number: rest }
    }
  }

  const match = trimmed.match(/^([A-Za-z0-9]+)[\s-]+(.+)$/)
  if (match) return { block: match[1], unit_number: match[2] }
  return { block: "Unassigned", unit_number: trimmed }
}

interface BulkSetupModalProps {
  open: boolean
  onClose: () => void
  onDone: () => void
  knownBlocks: string[]
}

export function BulkSetupModal({ open, onClose, onDone, knownBlocks }: BulkSetupModalProps) {
  const fileRef = useRef<HTMLInputElement>(null)

  // AI unit-range generation
  const [description, setDescription] = useState("")
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeResult, setRangeResult] = useState<string | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)

  // Excel import
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [mappingLoading, setMappingLoading] = useState(false)
  const [mappingError, setMappingError] = useState<string | null>(null)
  const [importSummary, setImportSummary] = useState<{
    rows_submitted: number
    units_created: number
    residents_upserted: number
    errors: { row: number; message: string }[]
  } | null>(null)
  const [importing, setImporting] = useState(false)

  async function generateUnits() {
    if (!description.trim()) return
    setRangeLoading(true)
    setRangeError(null)
    setRangeResult(null)
    try {
      const res = await api.post<{ requested: number; created: number }>("/api/units/ai-generate", { description })
      setRangeResult(`Created ${res.created} of ${res.requested} units (rest already existed).`)
      onDone()
    } catch (err) {
      setRangeError(errorMessage(err, "Failed to generate units"))
    } finally {
      setRangeLoading(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMappingError(null)
    setImportSummary(null)
    setMapping(null)

    const buf = await file.arrayBuffer()
    const workbook = read(buf)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const parsed = utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" })
    if (parsed.length === 0) {
      setMappingError("That sheet has no rows.")
      return
    }

    const sheetHeaders = Object.keys(parsed[0])
    setHeaders(sheetHeaders)
    setRows(parsed)

    setMappingLoading(true)
    try {
      const stringified = parsed.slice(0, 5).map((r) => {
        const out: Record<string, string> = {}
        for (const h of sheetHeaders) out[h] = String(r[h] ?? "")
        return out
      })
      const res = await api.post<{ mapping: Mapping; confidence: string; notes: string | null; ai_provider: string }>(
        "/api/residents/bulk-import/preview",
        { headers: sheetHeaders, sample_rows: stringified },
      )
      setMapping(res.mapping)
    } catch (err) {
      setMappingError(errorMessage(err, "AI mapping failed — map columns manually below."))
      setMapping({ name: null, phone: null, block: null, unit_number: null, combined_unit: null, is_owner: null, members_count: null })
    } finally {
      setMappingLoading(false)
    }
  }

  async function commitImport() {
    if (!mapping) return
    setImporting(true)
    setMappingError(null)
    try {
      const normalized = rows.map((row) => {
        const get = (h: string | null) => (h ? String(row[h] ?? "").trim() : "")
        let block = get(mapping.block)
        let unitNumber = get(mapping.unit_number)
        if (!block && !unitNumber && mapping.combined_unit) {
          const split = splitCombinedUnit(get(mapping.combined_unit), knownBlocks)
          block = split.block
          unitNumber = split.unit_number
        }
        const ownerRaw = get(mapping.is_owner).toLowerCase()
        const membersRaw = get(mapping.members_count)
        return {
          name: get(mapping.name),
          phone: get(mapping.phone),
          block: block || "Unassigned",
          unit_number: unitNumber || "0",
          is_owner: ownerRaw ? !ownerRaw.includes("tenant") : true,
          members_count: Number(membersRaw) > 0 ? Number(membersRaw) : 1,
        }
      })

      const valid = normalized.filter((r) => r.name && r.phone)
      const res = await api.post<typeof importSummary>("/api/residents/bulk-import/commit", { rows: valid })
      setImportSummary(res)
      onDone()
    } catch (err) {
      setMappingError(errorMessage(err, "Import failed"))
    } finally {
      setImporting(false)
    }
  }

  function reset() {
    setDescription("")
    setRangeResult(null)
    setRangeError(null)
    setHeaders([])
    setRows([])
    setMapping(null)
    setMappingError(null)
    setImportSummary(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Bulk setup"
    >
      <div className="space-y-8">
        <section>
          <h3 className="text-sm font-semibold text-ink-900">Describe your blocks & flat numbers</h3>
          <p className="mt-1 text-xs text-ink-500">
            e.g. "Block A has flats 101 to 450, Block B has flats 1 to 120" — AI reads the ranges, units are created automatically.
          </p>
          <Textarea
            rows={2}
            className="mt-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Block A: 101-450. Block B: 1-120."
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="button" size="sm" onClick={generateUnits} disabled={rangeLoading || !description.trim()}>
              <Sparkles size={14} /> {rangeLoading ? "Thinking… (up to a minute)" : "Generate units"}
            </Button>
          </div>
          {rangeError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-rust-700">
              <AlertCircle size={14} /> {rangeError}
            </p>
          )}
          {rangeResult && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-stamp-700">
              <CheckCircle2 size={14} /> {rangeResult}
            </p>
          )}
        </section>

        <hr className="border-ink-100" />

        <section>
          <h3 className="text-sm font-semibold text-ink-900">Import residents from Excel</h3>
          <p className="mt-1 text-xs text-ink-500">Upload whatever sheet you already have — AI figures out which columns mean what, you confirm before anything is saved.</p>

          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Choose file
          </Button>

          {mappingLoading && <p className="mt-2 text-xs text-ink-500">AI is reading your columns… (up to a minute)</p>}
          {mappingError && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-rust-700">
              <AlertCircle size={14} /> {mappingError}
            </p>
          )}

          {mapping && !importSummary && (
            <div className="mt-4 space-y-3 rounded-lg border border-ink-100 p-4">
              <p className="text-xs text-ink-500">{rows.length} rows found. Review the column mapping:</p>
              {MAPPING_FIELDS.map((f) => (
                <div key={f.key} className="grid grid-cols-2 items-center gap-3">
                  <Label className="!mb-0">
                    {f.label}
                    {f.required && <span className="text-rust-600"> *</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] ?? ""}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || null })}
                  >
                    <option value="">— not in sheet —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={commitImport}
                  disabled={importing || !mapping.name || !mapping.phone}
                >
                  {importing ? "Importing…" : `Import ${rows.length} rows`}
                </Button>
              </div>
            </div>
          )}

          {importSummary && (
            <div className="mt-4 rounded-lg border-2 border-stamp-500 bg-stamp-100 p-4 text-sm text-stamp-700">
              <p>
                Imported {importSummary.residents_upserted} residents, created {importSummary.units_created} new units.
              </p>
              {importSummary.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs">
                  {importSummary.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row + 1}: {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>
    </Modal>
  )
}
