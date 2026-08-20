import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, FileText, AlertCircle, ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Logo } from "@/components/ui/Logo"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"

interface DocRow {
  id: string
  title: string
  category: string
  imagekit_url: string
  created_at: string
}

const categoryLabel: Record<string, string> = {
  bylaws: "Bylaws",
  agm_minutes: "AGM minutes",
  sale_deed: "Sale deed",
  lease_agreement: "Lease agreement",
  noc: "NOC",
  other: "Other",
}

/** Resident read-only view of the document vault, scoped by visibility via `resident_list_documents`. */
export default function ResidentDocuments() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const unitId = session?.kind === "resident" ? session.unit_id : null
  const isRealUnit = !!unitId && unitId !== "dev-unit"

  const [docs, setDocs] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isRealUnit) {
      setLoading(false)
      return
    }
    supabaseAnon()
      .rpc("resident_list_documents", { p_unit_id: unitId })
      .then(({ data, error: rpcError }) => {
        if (rpcError) {
          setError(rpcError.message)
        } else {
          setDocs((data ?? []) as DocRow[])
        }
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId])

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-100 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={() => navigate("/resident")} className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100" aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <Logo size={22} />
        <span className="font-serif text-sm font-semibold text-ink-900">Documents</span>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!isRealUnit && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            We couldn't match your phone number to a resident record, so there's no real document list to show.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : docs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No documents shared with you yet.</Card>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <Card key={d.id} className="p-4">
                <a href={d.imagekit_url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <FileText size={18} className="mt-0.5 text-ink-400" />
                    <div>
                      <div className="text-sm font-semibold text-ink-900">{d.title}</div>
                      <div className="text-xs text-ink-500">
                        {categoryLabel[d.category] ?? d.category} · {formatDate(d.created_at)}
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="mt-1 text-ink-300" />
                </a>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
