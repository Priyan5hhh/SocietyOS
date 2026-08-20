import { useEffect, useState } from "react"
import { Plus, Pin, Sparkles, AlertCircle, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { NoNoticesIllustration } from "@/components/illustrations"
import { formatDate } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { getStaffSupabase } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface Notice {
  id: string
  title: string
  body: string
  pinned: boolean
  posted_at: string
}

type DeliveryStatus = "pending" | "sent" | "delivered" | "read" | "failed"

interface RecipientRow {
  notice_id: string
  resident_id: string
  delivery_status: DeliveryStatus
}

interface ResidentLabel {
  id: string
  name: string
  unitLabel: string
}

interface RecipientCounts {
  total: number
  pending: number
  sent: number
  delivered: number
  read: number
  failed: number
}

function emptyCounts(): RecipientCounts {
  return { total: 0, pending: 0, sent: 0, delivered: 0, read: 0, failed: 0 }
}

export default function Notices() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [roughNote, setRoughNote] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)
  const [suggestedAudience, setSuggestedAudience] = useState<"residents" | "guards" | "both" | null>(null)

  // Read receipts (item 15) — notice_recipients.delivery_status is populated
  // by societyos-api from WhatsApp Cloud API status webhooks (this is
  // WhatsApp's own blue-tick "read" state, not an in-app view event — there
  // is no resident-facing notices screen yet to generate that signal). This
  // reads straight from Supabase (admin staff JWT, RLS-scoped to the
  // society) since societyos-api doesn't expose a recipients rollup route.
  const [recipientCounts, setRecipientCounts] = useState<Map<string, RecipientCounts>>(new Map())
  const [recipientsByNotice, setRecipientsByNotice] = useState<Map<string, RecipientRow[]>>(new Map())
  const [residentLabels, setResidentLabels] = useState<Map<string, ResidentLabel>>(new Map())
  const [expandedNotice, setExpandedNotice] = useState<string | null>(null)
  const [receiptsError, setReceiptsError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { notices } = await api.get<{ notices: Notice[] }>("/api/notices")
      setNotices(notices)
      await loadReceipts(notices.map((n) => n.id))
    } catch (err) {
      setError(errorMessage(err, "Failed to load notices"))
    } finally {
      setLoading(false)
    }
  }

  async function loadReceipts(noticeIds: string[]) {
    if (noticeIds.length === 0) return
    setReceiptsError(null)
    try {
      const sb = getStaffSupabase()
      const [{ data: recipients, error: rErr }, { data: residents, error: resErr }, { data: units, error: uErr }] =
        await Promise.all([
          sb.from("notice_recipients").select("notice_id, resident_id, delivery_status").in("notice_id", noticeIds),
          sb.from("residents").select("id, name, unit_id"),
          sb.from("units").select("id, block, unit_number"),
        ])
      if (rErr) throw rErr
      if (resErr) throw resErr
      if (uErr) throw uErr

      const unitLabelById = new Map((units ?? []).map((u: { id: string; block: string; unit_number: string }) => [u.id, `${u.block}-${u.unit_number}`]))
      const labels = new Map<string, ResidentLabel>()
      for (const r of (residents ?? []) as { id: string; name: string; unit_id: string }[]) {
        labels.set(r.id, { id: r.id, name: r.name, unitLabel: unitLabelById.get(r.unit_id) ?? "—" })
      }
      setResidentLabels(labels)

      const byNotice = new Map<string, RecipientRow[]>()
      const counts = new Map<string, RecipientCounts>()
      for (const row of (recipients ?? []) as RecipientRow[]) {
        const list = byNotice.get(row.notice_id) ?? []
        list.push(row)
        byNotice.set(row.notice_id, list)

        const c = counts.get(row.notice_id) ?? emptyCounts()
        c.total += 1
        c[row.delivery_status] += 1
        counts.set(row.notice_id, c)
      }
      setRecipientsByNotice(byNotice)
      setRecipientCounts(counts)
    } catch (err) {
      setReceiptsError(errorMessage(err, "Failed to load read receipts"))
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function polishWithAi() {
    if (!roughNote.trim()) return
    setAiLoading(true)
    setAiNote(null)
    setSuggestedAudience(null)
    try {
      const { draft, ai_provider } = await api.post<{
        draft: { title: string; body: string; suggested_audience: "residents" | "guards" | "both" }
        ai_provider: string
      }>("/api/notices/ai-draft", { rough_note: roughNote })
      setTitle(draft.title)
      setBody(draft.body)
      setAiNote(`Polished by AI (${ai_provider}) — review before posting.`)
      if (draft.suggested_audience !== "residents") setSuggestedAudience(draft.suggested_audience)
    } catch {
      setAiNote("AI suggestion unavailable — write it manually below.")
    } finally {
      setAiLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const { notice } = await api.post<{ notice: Notice }>("/api/notices", { title, body, pinned, target: "all" })
      setNotices((prev) => [notice, ...prev])
      setModalOpen(false)
      setRoughNote("")
      setTitle("")
      setBody("")
      setPinned(false)
      setAiNote(null)
      setSuggestedAudience(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to post notice"))
    } finally {
      setSaving(false)
    }
  }

  const sorted = [...notices].sort((a, b) => Number(b.pinned) - Number(a.pinned))

  return (
    <div>
      <PageHeader
        title="Notices & Announcements"
        description="Sent to every resident's WhatsApp when posted."
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New notice
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

        {loading ? (
          <Card>
            <TableSkeleton rows={3} cols={1} />
          </Card>
        ) : sorted.length === 0 ? (
          <Card>
            <EmptyState
              illustration={<NoNoticesIllustration />}
              title="No notices yet"
              description="Post your first announcement — it'll be broadcast to residents over WhatsApp."
              action={<Button onClick={() => setModalOpen(true)}>New notice</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sorted.map((n) => (
              <Card key={n.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-ink-900">{n.title}</h3>
                  {n.pinned && <Pin size={14} className="mt-0.5 shrink-0 fill-amber-500 text-amber-600" />}
                </div>
                <p className="mt-2 text-sm text-ink-500">{n.body}</p>

                {receiptsError ? (
                  <p className="mt-4 text-xs text-rust-600">{receiptsError}</p>
                ) : (
                  (() => {
                    const counts = recipientCounts.get(n.id)
                    if (!counts || counts.total === 0) return null
                    const unread = (recipientsByNotice.get(n.id) ?? []).filter((r) => r.delivery_status !== "read")
                    const isExpanded = expandedNotice === n.id
                    return (
                      <div className="mt-4 border-t border-ink-100 pt-3">
                        <div className="flex items-center gap-1.5 text-xs text-ink-500">
                          <Eye size={13} />
                          <span>
                            {counts.sent + counts.delivered + counts.read} sent · {counts.delivered + counts.read} delivered ·{" "}
                            <span className="font-medium text-ink-700">{counts.read} read</span>
                            {counts.failed > 0 && ` · ${counts.failed} failed`}
                          </span>
                        </div>
                        {unread.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedNotice(isExpanded ? null : n.id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stamp-600 hover:underline"
                          >
                            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {unread.length} haven't read this yet
                          </button>
                        )}
                        {isExpanded && (
                          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md bg-paper-50 p-2 text-xs text-ink-700">
                            {unread.map((r) => {
                              const label = residentLabels.get(r.resident_id)
                              return (
                                <li key={r.resident_id} className="flex items-center justify-between gap-2">
                                  <span>
                                    {label?.name ?? "Unknown resident"} <span className="text-ink-400">({label?.unitLabel ?? "—"})</span>
                                  </span>
                                  <span className="capitalize text-ink-400">{r.delivery_status}</span>
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    )
                  })()
                )}

                <div className="mt-3 flex items-center justify-end text-xs text-ink-300">
                  <span>{formatDate(n.posted_at)}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New notice">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="n-rough">Rough note (optional)</Label>
            <Textarea
              id="n-rough"
              rows={2}
              placeholder="e.g. water off tomorrow 10-2 for tank cleaning pls inform everyone"
              value={roughNote}
              onChange={(e) => setRoughNote(e.target.value)}
            />
            <button
              type="button"
              onClick={polishWithAi}
              disabled={aiLoading || !roughNote.trim()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-stamp-600 hover:underline disabled:opacity-50"
            >
              <Sparkles size={14} /> {aiLoading ? "Polishing… (up to a minute)" : "Polish with AI"}
            </button>
            {aiNote && <p className="mt-1 text-xs text-ink-500">{aiNote}</p>}
            {suggestedAudience && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Sparkles size={11} />
                Suggested: also notify {suggestedAudience === "both" ? "residents and guards" : "guards"}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="n-title">Title</Label>
            <Input id="n-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="n-body">Message</Label>
            <Textarea id="n-body" required value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 rounded border-ink-300" />
            Pin to top
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Posting…" : "Post notice"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
