import { useEffect, useRef, useState } from "react"
import { MessageCircle, AlertCircle, Wrench, UploadCloud } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Stamp } from "@/components/ui/Stamp"
import { Button } from "@/components/ui/Button"
import { Select, Label, Input } from "@/components/ui/Input"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Modal } from "@/components/ui/Modal"
import { NoTicketsIllustration } from "@/components/illustrations"
import { errorMessage, formatDate, formatTime, formatINR } from "@/lib/utils"
import { getStaffSupabase } from "@/lib/services/supabase"
import { uploadImage } from "@/lib/services/storage"

type TicketStatus = "new" | "assigned" | "in_progress" | "resolved" | "reopened"
type TicketPriority = "low" | "medium" | "high"

interface Ticket {
  id: string
  category: string
  subcategory: string | null
  priority: TicketPriority
  status: TicketStatus
  description: string
  original_message: string | null
  resident_name: string | null
  created_at: string
  units: { block: string; unit_number: string } | null
  assigned_to_staff_id: string | null
  vendor_id: string | null
  resolution_cost: number | null
  resolution_notes: string | null
}

interface Vendor {
  id: string
  name: string
}

const priorityTone = { high: "rust", medium: "amber", low: "ink" } as const
const statusTone = { new: "rust", assigned: "amber", in_progress: "amber", resolved: "stamp", reopened: "rust" } as const
const statusLabel = {
  new: "New",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  reopened: "Reopened",
}

const nextStatus: Record<TicketStatus, TicketStatus | null> = {
  new: "in_progress",
  assigned: "in_progress",
  in_progress: "resolved",
  resolved: null,
  reopened: "in_progress",
}

/**
 * Facility manager's own ticket queue — same underlying `tickets` table as
 * Admin → Ticket Queue, but scoped to open work (facility managers don't
 * need to see already-resolved history by default) and with a resolution
 * flow that captures vendor + cost + a "resolved" photo, per the phase 2
 * research doc's facility-manager bundle. Queries Supabase directly (RLS
 * already lets the 'facility' role read/update tickets for its society).
 */
export default function FacilityTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<"open" | "all" | TicketStatus>("open")

  const [resolving, setResolving] = useState<Ticket | null>(null)
  const [vendorId, setVendorId] = useState("")
  const [cost, setCost] = useState("")
  const [notes, setNotes] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      let query = sb
        .from("tickets")
        .select(
          "id, category, subcategory, priority, status, description, original_message, resident_name, created_at, units(block, unit_number), assigned_to_staff_id, vendor_id, resolution_cost, resolution_notes",
        )
        .order("created_at", { ascending: false })
      if (statusFilter === "open") query = query.in("status", ["new", "assigned", "in_progress", "reopened"])
      else if (statusFilter !== "all") query = query.eq("status", statusFilter)

      const [ticketsRes, vendorsRes] = await Promise.all([
        query,
        sb.from("vendors").select("id, name").eq("active", true).order("name"),
      ])
      if (ticketsRes.error) throw ticketsRes.error
      if (vendorsRes.error) throw vendorsRes.error
      setTickets((ticketsRes.data ?? []) as unknown as Ticket[])
      setVendors((vendorsRes.data ?? []) as Vendor[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load tickets"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function advance(t: Ticket) {
    const to = nextStatus[t.status]
    if (!to) return
    if (to === "resolved") {
      setResolving(t)
      setVendorId(t.vendor_id ?? "")
      setCost(t.resolution_cost != null ? String(t.resolution_cost) : "")
      setNotes(t.resolution_notes ?? "")
      setPhotoFile(null)
      return
    }
    try {
      const sb = getStaffSupabase()
      const { data, error: err } = await sb.from("tickets").update({ status: to }).eq("id", t.id).select().single()
      if (err) throw err
      setTickets((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...(data as Partial<Ticket>) } : x)))
    } catch (err) {
      setError(errorMessage(err, "Failed to update ticket"))
    }
  }

  async function submitResolution() {
    if (!resolving) return
    setSaving(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: err } = await sb
        .from("tickets")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          vendor_id: vendorId || null,
          resolution_cost: cost ? Number(cost) : null,
          resolution_notes: notes || null,
        })
        .eq("id", resolving.id)
        .select()
        .single()
      if (err) throw err

      if (photoFile) {
        const uploaded = await uploadImage(photoFile, "ticket-photos")
        await sb.from("ticket_attachments").insert({
          ticket_id: resolving.id,
          imagekit_url: uploaded.url,
          imagekit_file_id: uploaded.fileId,
          stage: "resolved",
        })
      }

      setTickets((prev) =>
        statusFilter === "open" ? prev.filter((x) => x.id !== resolving.id) : prev.map((x) => (x.id === resolving.id ? { ...x, ...(data as Partial<Ticket>) } : x)),
      )
      setResolving(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to resolve ticket"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Ticket Queue"
        description="Complaints and requests assigned to facility, auto-converted from resident WhatsApp messages."
        action={
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="w-44">
            <option value="open">Open</option>
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="reopened">Reopened</option>
          </Select>
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
            <TableSkeleton rows={4} cols={1} />
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <EmptyState illustration={<NoTicketsIllustration />} title="No tickets here" description="Nothing open right now." />
          </Card>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-ink-500">
                        {t.units ? `${t.units.block}-${t.units.unit_number}` : "—"}
                      </span>
                      <span className="text-sm font-semibold text-ink-900">{t.resident_name ?? "Unknown resident"}</span>
                      <span className="text-ink-200">·</span>
                      <span className="text-xs text-ink-500 capitalize">{t.category}</span>
                      <span className="text-ink-200">·</span>
                      <span className="text-xs text-ink-500">
                        {formatDate(t.created_at)} {formatTime(t.created_at)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-paper-100 p-3">
                      <MessageCircle size={16} className="mt-0.5 shrink-0 text-stamp-600" />
                      <p className="text-sm text-ink-700">{t.original_message ?? t.description}</p>
                    </div>

                    {t.status === "resolved" && (t.resolution_cost != null || t.resolution_notes) && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-ink-100 p-3 text-xs text-ink-600">
                        <Wrench size={14} className="mt-0.5 shrink-0" />
                        <span>
                          {t.resolution_cost != null && <>Cost: {formatINR(t.resolution_cost)} </>}
                          {vendors.find((v) => v.id === t.vendor_id)?.name && <>· Vendor: {vendors.find((v) => v.id === t.vendor_id)?.name} </>}
                          {t.resolution_notes && <>· {t.resolution_notes}</>}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Stamp tone={priorityTone[t.priority]}>{t.priority}</Stamp>
                    <Stamp tone={statusTone[t.status]}>{statusLabel[t.status]}</Stamp>
                    {nextStatus[t.status] && (
                      <button onClick={() => advance(t)} className="mt-1 text-xs font-medium text-ink-700 hover:underline">
                        {t.status === "new" || t.status === "assigned" ? "Mark in progress →" : "Mark resolved →"}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!resolving} onClose={() => setResolving(null)} title="Resolve ticket">
        <div className="space-y-4">
          <div>
            <Label htmlFor="rs-vendor">Vendor (optional)</Label>
            <Select id="rs-vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
              <option value="">None</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="rs-cost">Cost (₹, optional)</Label>
            <Input id="rs-cost" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="rs-notes">Resolution notes</Label>
            <Input id="rs-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was done…" />
          </div>
          <div>
            <Label>Photo of completed work (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-200 py-4 text-sm text-ink-500 hover:bg-paper-50"
            >
              <UploadCloud size={16} /> {photoFile ? photoFile.name : "Upload photo"}
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setResolving(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={submitResolution} disabled={saving}>
              {saving ? "Saving…" : "Mark resolved"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
