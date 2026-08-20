import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Vote as VoteIcon, AlertCircle, CheckCircle2, BarChart3 } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Stamp } from "@/components/ui/Stamp"
import { Logo } from "@/components/ui/Logo"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

interface ElectionRow {
  id: string
  title: string
  description: string | null
  voting_opens_at: string
  voting_closes_at: string
  status: "open" | "closed"
  has_voted: boolean
}

interface Candidate {
  id: string
  name: string
  statement: string | null
}

interface Result {
  candidate_id: string
  candidate_name: string
  vote_count: number
}

/**
 * Resident voting — one authenticated resident session (unit) casts one vote
 * per election, enforced by the DB unique(election_id, unit_id) constraint
 * via the `cast_vote` RPC. Results view only unlocks once the election is
 * closed (`election_results` RPC checks that server-side).
 */
export default function ResidentVote() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const unitId = session?.kind === "resident" ? session.unit_id : null
  const isRealUnit = !!unitId && unitId !== "dev-unit"

  const [elections, setElections] = useState<ElectionRow[]>([])
  const [candidates, setCandidates] = useState<Map<string, Candidate[]>>(new Map())
  const [results, setResults] = useState<Map<string, Result[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  async function load() {
    if (!isRealUnit) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const sb = supabaseAnon()
      const { data, error: rpcError } = await sb.rpc("resident_list_elections", { p_unit_id: unitId })
      if (rpcError) throw rpcError
      const els = (data ?? []) as ElectionRow[]
      setElections(els)

      const candMap = new Map<string, Candidate[]>()
      const resMap = new Map<string, Result[]>()
      for (const el of els) {
        const { data: cData } = await sb.rpc("resident_list_candidates", { p_election_id: el.id })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  async function vote(electionId: string, candidateId: string) {
    if (!unitId) return
    setVotingId(electionId)
    setNote(null)
    try {
      const { error: rpcError } = await supabaseAnon().rpc("cast_vote", {
        p_election_id: electionId,
        p_unit_id: unitId,
        p_candidate_id: candidateId,
      })
      if (rpcError) throw rpcError
      setNote("Your vote has been recorded.")
      await load()
    } catch (err) {
      setNote(errorMessage(err, "Failed to cast vote"))
    } finally {
      setVotingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-100 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate("/resident")} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <Logo size={22} />
        <span className="font-serif text-sm font-semibold text-ink-900">Elections</span>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!isRealUnit && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            We couldn't match your phone number to a resident record, so there's no unit to vote with.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {note && <p className="mb-4 text-sm text-ink-700">{note}</p>}

        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : elections.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <VoteIcon size={24} className="mx-auto mb-2 text-ink-300" />
            No elections open right now.
          </Card>
        ) : (
          <div className="space-y-4">
            {elections.map((el) => (
              <Card key={el.id} className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink-900">{el.title}</span>
                  <Stamp tone={el.status === "open" ? "stamp" : "amber"}>{el.status}</Stamp>
                </div>
                {el.description && <p className="mt-1 text-xs text-ink-500">{el.description}</p>}
                <p className="mt-1 text-xs text-ink-400">Closes {formatDate(el.voting_closes_at)}</p>

                {el.status === "closed" ? (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
                      <BarChart3 size={13} /> Results
                    </div>
                    {(results.get(el.id) ?? []).map((r) => (
                      <div key={r.candidate_id} className="flex items-center justify-between text-sm">
                        <span>{r.candidate_name}</span>
                        <span className="font-mono font-semibold">{r.vote_count}</span>
                      </div>
                    ))}
                  </div>
                ) : el.has_voted ? (
                  <div className="mt-3 flex items-center gap-1.5 rounded-md bg-stamp-100 px-2.5 py-1.5 text-xs font-medium text-stamp-800">
                    <CheckCircle2 size={13} /> You've voted — results after voting closes.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {(candidates.get(el.id) ?? []).map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-md border border-ink-100 p-2.5">
                        <div>
                          <div className="text-sm font-medium text-ink-900">{c.name}</div>
                          {c.statement && <div className="text-xs text-ink-500">{c.statement}</div>}
                        </div>
                        <Button size="sm" disabled={votingId === el.id} onClick={() => vote(el.id, c.id)}>
                          Vote
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
