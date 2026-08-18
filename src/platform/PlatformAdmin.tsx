import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Button } from "@/components/ui/Button"
import { Stamp } from "@/components/ui/Stamp"
import { useAuth } from "@/lib/auth-context"
import { formatDate } from "@/lib/utils"
import { api } from "@/lib/services/api"

interface SignupRequest {
  id: string
  society_name: string
  requester_name: string
  requester_email: string
  status: "pending" | "approved" | "rejected"
  created_at: string
}

const statusTone = { pending: "amber", approved: "stamp", rejected: "rust" } as const

export default function PlatformAdmin() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { requests } = await api.get<{ requests: SignupRequest[] }>("/api/platform/signup-requests")
      setRequests(requests)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signup requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function approve(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/api/platform/signup-requests/${id}/approve`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve")
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    setBusyId(id)
    setError(null)
    try {
      await api.post(`/api/platform/signup-requests/${id}/reject`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject")
    } finally {
      setBusyId(null)
    }
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const pending = requests.filter((r) => r.status === "pending")
  const reviewed = requests.filter((r) => r.status !== "pending")

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="flex items-center justify-between border-b border-ink-100 bg-chrome-900 px-8 py-4">
        <span className="font-serif text-lg font-semibold text-white">Platform Admin</span>
        <button onClick={handleLogout} aria-label="Log out" className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white">
          <LogOut size={18} />
        </button>
      </header>

      <div className="mx-auto max-w-3xl p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Pending society signups ({loading ? "…" : pending.length})
        </h2>

        {loading ? (
          <Card>
            <TableSkeleton rows={3} cols={2} />
          </Card>
        ) : pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No pending requests.</Card>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <Card key={r.id} className="flex items-center justify-between p-5">
                <div>
                  <div className="font-medium text-ink-900">{r.society_name}</div>
                  <div className="text-sm text-ink-500">
                    {r.requester_name} · {r.requester_email}
                  </div>
                  <div className="mt-1 text-xs text-ink-300">{formatDate(r.created_at)}</div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={busyId === r.id} onClick={() => reject(r.id)}>
                    <XCircle size={16} /> Reject
                  </Button>
                  <Button type="button" disabled={busyId === r.id} onClick={() => approve(r.id)}>
                    <CheckCircle2 size={16} /> {busyId === r.id ? "Working…" : "Approve"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-ink-500">Reviewed</h2>
            <div className="space-y-2">
              {reviewed.map((r) => (
                <Card key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium text-ink-900">{r.society_name}</div>
                    <div className="text-xs text-ink-500">
                      {r.requester_name} · {r.requester_email}
                    </div>
                  </div>
                  <Stamp tone={statusTone[r.status]}>{r.status}</Stamp>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
