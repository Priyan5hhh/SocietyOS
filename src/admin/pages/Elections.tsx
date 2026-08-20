import { useEffect, useState } from "react"
import { Vote, Plus, AlertCircle, PlayCircle, StopCircle, BarChart3, Ban } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, Textarea } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Stamp } from "@/components/ui/Stamp"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface Election {
  id: string
  title: string
  description: string | null
  voting_opens_at: string
  voting_closes_at: string
  status: "draft" | "open" | "closed" | "cancelled"
}

interface Candidate {
  id: string
  election_id: string
  name: string
  statement: string | null
}

interface Result {
  candidate_id: string
  candidate_name: string
  vote_count: number
}

const statusTone = { draft: "ink", open: "stamp", closed: "amber", cancelled: "rust" } as const

/**
 * Elections (item 13, governance half) — create an election with candidates,
 * open/close voting, view tallies once closed. Ballot integrity comes from
 * the DB: `unique(election_id, unit_id)` on `election_votes` enforces one
 * vote per unit, and votes go through the resident session the same way
 * every other resident write does. See docs/pipeline/phase3-research.md §4
 * for why full e-signature integration is out of scope, not stubbed here.
 */
export default function Elections() {
  const [elections, setElections] = useState<Election[]>([])
  const [candidates, setCandidates] = useState<Map<string, Candidate[]>>(new Map())
  const [results, setResults] = useState<Map<string, Result[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [opensAt, setOpensAt] = useState("")
  const [closesAt, setClosesAt] = useState("")
  const [candidateNames, setCandidateNames] = useState(["", ""])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [confirmCancel, setConfirmCancel] = useState<Election | null>(null)
  const [cancelling, setCancelling] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: qErr } = await sb.from("elections").select("*").order("created_at", { ascending: false })
      if (qErr) throw qErr
      const els = (data ?? []) as Election[]
      setElections(els)

      const candMap = new Map<string, Candidate[]>()
      const resMap = new Map<string, Result[]>()
      for (const el of els) {
        const { data: cData } = await sb.from("election_candidates").select("*").eq("election_id", el.id).order("display_order")
        candMap.set(el.id, (cData ?? []) as Candidate[])
        if (el.status === "closed") {
          const { data: rData } = await sb.rpc("election_results", { p_election_id: el.id })
          resMap.set(el.id, (rData ?? []) as Result[])
        }
      }
      setCandidates(candMap)
      setResults(resMap)
    } catch (err) {
      setError(errorMessage(err, "Failed to load elections"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openModal() {
    setTitle("")
    setDescription("")
    const now = new Date()
    const closes = new Date()
    closes.setDate(closes.getDate() + 7)
    setOpensAt(now.toISOString().slice(0, 16))
    setClosesAt(closes.toISOString().slice(0, 16))
    setCandidateNames(["", ""])
    setFormError(null)
    setModalOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId, staffId } = getStaffClaims()
      const names = candidateNames.map((n) => n.trim()).filter(Boolean)
      if (names.length < 2) {
        throw new Error("Add at least two candidates.")
      }
      // Single-transaction RPC: the election row and all candidate rows are
      // inserted in one plpgsql function body, so a failure partway through
      // rolls back the whole thing instead of leaving an election with zero
      // candidates.
      const { error: rpcErr } = await sb.rpc("admin_create_election", {
        p_society_id: societyId,
        p_staff_id: staffId,
        p_title: title,
        p_description: description || null,
        p_opens_at: new Date(opensAt).toISOString(),
        p_closes_at: new Date(closesAt).toISOString(),
        p_candidate_names: names,
      })
      if (rpcErr) throw rpcErr

      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(errorMessage(err, "Failed to create election"))
    } finally {
      setSaving(false)
    }
  }

  async function setStatus(el: Election, status: Election["status"]) {
    try {
      const sb = getStaffSupabase()
      const { error: uErr } = await sb.from("elections").update({ status }).eq("id", el.id)
      if (uErr) throw uErr
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to update election"))
    }
  }

  async function handleCancelElection() {
    if (!confirmCancel) return
    setCancelling(true)
    try {
      await setStatus(confirmCancel, "cancelled")
      setConfirmCancel(null)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Elections"
        description="Managing committee / AGM elections — create, open, close, and tally."
        action={
          <Button onClick={openModal}>
            <Plus size={16} /> New election
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
            <TableSkeleton rows={3} cols={2} />
          </Card>
        ) : elections.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <Vote size={24} className="mx-auto mb-2 text-ink-300" />
            No elections yet.
          </Card>
        ) : (
          <div className="space-y-4">
            {elections.map((el) => (
              <Card key={el.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900">{el.title}</span>
                      <Stamp tone={statusTone[el.status]}>{el.status}</Stamp>
                    </div>
                    {el.description && <p className="mt-1 text-xs text-ink-500">{el.description}</p>}
                    <p className="mt-1 text-xs text-ink-400">
                      {formatDate(el.voting_opens_at)} – {formatDate(el.voting_closes_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {el.status === "draft" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(el, "open")}>
                        <PlayCircle size={14} /> Open voting
                      </Button>
                    )}
                    {el.status === "open" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(el, "closed")}>
                        <StopCircle size={14} /> Close voting
                      </Button>
                    )}
                    {(el.status === "draft" || el.status === "open") && (
                      <Button size="sm" variant="danger" onClick={() => setConfirmCancel(el)}>
                        <Ban size={14} /> Cancel election
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(candidates.get(el.id) ?? []).map((c) => {
                    const res = results.get(el.id)?.find((r) => r.candidate_id === c.id)
                    return (
                      <span key={c.id} className="rounded-md border border-ink-100 bg-paper-50 px-2.5 py-1 text-xs">
                        {c.name}
                        {res !== undefined && <span className="ml-1.5 font-mono font-semibold text-stamp-700">{res.vote_count}</span>}
                      </span>
                    )
                  })}
                </div>

                {el.status === "closed" && (results.get(el.id)?.length ?? 0) > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ink-700">
                    <BarChart3 size={13} /> Results tallied above
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New election">
        <form onSubmit={submit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-2.5 text-xs text-rust-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}
          <div>
            <Label htmlFor="el-title">Title</Label>
            <Input id="el-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Managing Committee Election 2026" />
          </div>
          <div>
            <Label htmlFor="el-desc">Description (optional)</Label>
            <Textarea id="el-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="el-opens">Voting opens</Label>
              <Input id="el-opens" type="datetime-local" required value={opensAt} onChange={(e) => setOpensAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="el-closes">Voting closes</Label>
              <Input id="el-closes" type="datetime-local" required value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Candidates</Label>
            <div className="space-y-2">
              {candidateNames.map((name, i) => (
                <Input
                  key={i}
                  value={name}
                  onChange={(e) => setCandidateNames((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={`Candidate ${i + 1} name`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setCandidateNames((prev) => [...prev, ""])}
              className="mt-2 text-xs font-medium text-ink-700 hover:underline"
            >
              + Add another candidate
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create election"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Cancel election">
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            Cancel <strong>{confirmCancel?.title}</strong>? Voting stops immediately — residents will no longer see it in
            their vote list. Any votes already cast are not counted, and no results will ever be shown for this election.
            This can't be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmCancel(null)}>
              Keep election
            </Button>
            <Button type="button" variant="danger" onClick={handleCancelElection} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel election"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
