import { useEffect, useState } from "react"
import { AlertCircle, Search, Link2, HelpCircle } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { errorMessage, formatDate, formatTime } from "@/lib/utils"
import { getStaffSupabase } from "@/lib/services/supabase"

interface Resident {
  id: string
  name: string
  phone: string
  unit_id: string
  units: { block: string; unit_number: string } | null
}

interface Ticket {
  id: string
  category: string
  description: string
  original_message: string | null
  resident_name: string | null
  resident_phone: string | null
  unit_id: string | null
  intake_confidence: string | null
  resident_match_status: "matched" | "unmatched" | "ambiguous"
  created_at: string
}

/**
 * Admin recovery screen for WhatsApp-originated tickets the bot couldn't
 * confidently match to a resident (see docs/pipeline/phase2-research.md §3.2
 * "Admin intake review"). The bot's matching logic itself lives in the
 * separate societyos-api repo — this only gives admins a place to fix what
 * it got wrong, and a place for that backend to write its confidence signal
 * instead of silently rendering "Unknown resident" with no recovery path.
 */
export default function IntakeReview() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [linking, setLinking] = useState<Ticket | null>(null)
  const [query, setQuery] = useState("")
  const [candidates, setCandidates] = useState<Resident[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: err } = await sb
        .from("tickets")
        .select("id, category, description, original_message, resident_name, resident_phone, unit_id, intake_confidence, resident_match_status, created_at")
        .neq("resident_match_status", "matched")
        .order("created_at", { ascending: false })
      if (err) throw err
      setTickets((data ?? []) as Ticket[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load intake review queue"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openLink(t: Ticket) {
    setLinking(t)
    setQuery(t.resident_phone ?? "")
    setCandidates([])
  }

  async function search() {
    if (!query.trim()) return
    setSearching(true)
    try {
      const sb = getStaffSupabase()
      const { data, error: err } = await sb
        .from("residents")
        .select("id, name, phone, unit_id, units(block, unit_number)")
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(10)
      if (err) throw err
      setCandidates((data ?? []) as unknown as Resident[])
    } catch (err) {
      setError(errorMessage(err, "Search failed"))
    } finally {
      setSearching(false)
    }
  }

  async function link(resident: Resident) {
    if (!linking) return
    setSaving(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { error: err } = await sb
        .from("tickets")
        .update({
          unit_id: resident.unit_id,
          resident_name: resident.name,
          resident_phone: resident.phone,
          resident_match_status: "matched",
        })
        .eq("id", linking.id)
      if (err) throw err
      setTickets((prev) => prev.filter((t) => t.id !== linking.id))
      setLinking(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to link ticket"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Intake Review"
        description="WhatsApp tickets the bot couldn't confidently match to a resident — link them by hand."
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
            <TableSkeleton rows={3} cols={1} />
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <EmptyState
              title="Nothing to review"
              description="Every WhatsApp-created ticket has been matched to a resident. Unmatched or ambiguous ones will show up here."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stamp tone={t.resident_match_status === "unmatched" ? "rust" : "amber"}>
                        {t.resident_match_status === "unmatched" ? "Unmatched" : "Ambiguous"}
                      </Stamp>
                      <span className="text-xs text-ink-500 capitalize">{t.category}</span>
                      <span className="text-ink-200">·</span>
                      <span className="text-xs text-ink-500">
                        {formatDate(t.created_at)} {formatTime(t.created_at)}
                      </span>
                      {t.intake_confidence && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-paper-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                          <HelpCircle size={10} /> confidence: {t.intake_confidence}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-ink-500">
                      From phone: <span className="font-mono">{t.resident_phone ?? "unknown"}</span>
                      {t.resident_name && <> · claimed name: {t.resident_name}</>}
                    </div>
                    <div className="mt-3 rounded-lg bg-paper-100 p-3 text-sm text-ink-700">
                      {t.original_message ?? t.description}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openLink(t)}>
                    <Link2 size={14} /> Link resident
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!linking} onClose={() => setLinking(null)} title="Link to resident">
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or phone"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
            <Button type="button" variant="secondary" onClick={search} disabled={searching}>
              <Search size={16} /> {searching ? "…" : "Search"}
            </Button>
          </div>
          {candidates.length === 0 ? (
            <p className="text-sm text-ink-500">Search for the resident this ticket belongs to.</p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {candidates.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => link(r)}
                  disabled={saving}
                  className="flex w-full items-center justify-between rounded-lg border border-ink-100 p-3 text-left text-sm hover:bg-paper-50 disabled:opacity-50"
                >
                  <span>
                    <span className="block font-medium text-ink-900">{r.name}</span>
                    <span className="block text-xs text-ink-500">{r.phone}</span>
                  </span>
                  <span className="font-mono text-xs text-ink-500">
                    {r.units ? `${r.units.block}-${r.units.unit_number}` : "no unit"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
