import { useEffect, useState } from "react"
import { Plus, Pin, Sparkles, AlertCircle } from "lucide-react"
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

interface Notice {
  id: string
  title: string
  body: string
  pinned: boolean
  posted_at: string
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

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { notices } = await api.get<{ notices: Notice[] }>("/api/notices")
      setNotices(notices)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notices")
    } finally {
      setLoading(false)
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
      setError(err instanceof Error ? err.message : "Failed to post notice")
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
                <div className="mt-4 flex items-center justify-end text-xs text-ink-300">
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
