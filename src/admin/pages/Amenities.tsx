import { useEffect, useState } from "react"
import { Plus, AlertCircle, Pencil, Power, CheckCircle2, XCircle } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { errorMessage, formatDate, formatINR } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"

type BookingType = "slot" | "full_day"

interface Amenity {
  id: string
  name: string
  booking_type: BookingType
  requires_approval: boolean
  fee_amount: number
  capacity: number | null
  slot_duration_minutes: number | null
  open_time: string | null
  close_time: string | null
  advance_booking_days: number
  cancellation_cutoff_hours: number
  active: boolean
  created_at: string
}

interface Booking {
  id: string
  amenity_id: string
  booking_date: string
  start_time: string | null
  end_time: string | null
  status: string
  fee_amount: number
  created_at: string
  residents: { name: string; phone: string } | null
  units: { block: string; unit_number: string } | null
  amenities: { name: string } | null
}

function emptyForm() {
  return {
    name: "",
    booking_type: "slot" as BookingType,
    requires_approval: false,
    fee_amount: 0,
    capacity: "",
    slot_duration_minutes: "60",
    open_time: "08:00",
    close_time: "20:00",
    advance_booking_days: 7,
    cancellation_cutoff_hours: 2,
  }
}

export default function Amenities() {
  const [tab, setTab] = useState<"amenities" | "approvals">("amenities")
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [pending, setPending] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Amenity | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const [{ data: amenitiesData, error: aErr }, { data: pendingData, error: pErr }] = await Promise.all([
        sb.from("amenities").select("*").order("name"),
        sb
          .from("amenity_bookings")
          .select("*, residents(name, phone), units(block, unit_number), amenities(name)")
          .eq("status", "pending_approval")
          .order("booking_date"),
      ])
      if (aErr) throw aErr
      if (pErr) throw pErr
      setAmenities((amenitiesData ?? []) as Amenity[])
      setPending((pendingData ?? []) as unknown as Booking[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load amenities"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(a: Amenity) {
    setEditing(a)
    setForm({
      name: a.name,
      booking_type: a.booking_type,
      requires_approval: a.requires_approval,
      fee_amount: a.fee_amount,
      capacity: a.capacity != null ? String(a.capacity) : "",
      slot_duration_minutes: a.slot_duration_minutes != null ? String(a.slot_duration_minutes) : "",
      open_time: a.open_time ?? "08:00",
      close_time: a.close_time ?? "20:00",
      advance_booking_days: a.advance_booking_days,
      cancellation_cutoff_hours: a.cancellation_cutoff_hours,
    })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const payload = {
        name: form.name,
        booking_type: form.booking_type,
        requires_approval: form.requires_approval,
        fee_amount: Number(form.fee_amount) || 0,
        capacity: form.capacity ? Number(form.capacity) : null,
        slot_duration_minutes: form.booking_type === "slot" && form.slot_duration_minutes ? Number(form.slot_duration_minutes) : null,
        open_time: form.open_time || null,
        close_time: form.close_time || null,
        advance_booking_days: Number(form.advance_booking_days) || 7,
        cancellation_cutoff_hours: Number(form.cancellation_cutoff_hours) || 2,
      }
      if (editing) {
        const { error: upErr } = await sb.from("amenities").update(payload).eq("id", editing.id)
        if (upErr) throw upErr
      } else {
        // society_id is filled by whichever society the admin's JWT carries —
        // amenities RLS enforces it matches, but we still need to send it.
        const { societyId } = getStaffClaims()
        const { error: insErr } = await sb.from("amenities").insert({ ...payload, society_id: societyId })
        if (insErr) throw insErr
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to save amenity"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(a: Amenity) {
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { error: upErr } = await sb.from("amenities").update({ active: !a.active }).eq("id", a.id)
      if (upErr) throw upErr
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to update amenity"))
    }
  }

  async function decide(b: Booking, decision: "confirmed" | "rejected") {
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { error: upErr } = await sb.from("amenity_bookings").update({ status: decision }).eq("id", b.id)
      if (upErr) throw upErr
      setPending((prev) => prev.filter((x) => x.id !== b.id))
    } catch (err) {
      setError(errorMessage(err, "Failed to update booking"))
    }
  }

  return (
    <div>
      <PageHeader
        title="Amenities"
        description="Configure bookable amenities and review requests that need approval."
        action={
          tab === "amenities" ? (
            <Button onClick={openAdd}>
              <Plus size={16} /> Add amenity
            </Button>
          ) : undefined
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-1 rounded-lg border border-ink-100 bg-white p-1 w-fit">
          <button
            type="button"
            onClick={() => setTab("amenities")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "amenities" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            Amenities
          </button>
          <button
            type="button"
            onClick={() => setTab("approvals")}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "approvals" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            Approval queue {pending.length > 0 && `(${pending.length})`}
          </button>
        </div>

        <Card>
          {loading ? (
            <TableSkeleton rows={4} cols={6} />
          ) : tab === "amenities" ? (
            amenities.length === 0 ? (
              <EmptyState title="No amenities yet" description="Add your first bookable amenity — clubhouse, gym, guest room, etc." />
            ) : (
              <Table>
                <Thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Type</Th>
                    <Th>Fee</Th>
                    <Th>Capacity</Th>
                    <Th>Approval</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </Thead>
                <Tbody>
                  {amenities.map((a) => (
                    <Tr key={a.id} className={!a.active ? "opacity-50" : undefined}>
                      <Td className="font-medium">{a.name}</Td>
                      <Td className="capitalize">{a.booking_type.replace("_", " ")}</Td>
                      <Td>{a.fee_amount > 0 ? formatINR(a.fee_amount) : "Free"}</Td>
                      <Td>{a.capacity ?? "Unlimited"}</Td>
                      <Td>
                        <Stamp tone={a.requires_approval ? "amber" : "stamp"}>
                          {a.requires_approval ? "Requires approval" : "Instant book"}
                        </Stamp>
                      </Td>
                      <Td>
                        <Stamp tone={a.active ? "stamp" : "rust"}>{a.active ? "Active" : "Inactive"}</Stamp>
                      </Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(a)}
                            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                            aria-label={`Edit ${a.name}`}
                            title="Edit"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => toggleActive(a)}
                            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                            aria-label={a.active ? `Deactivate ${a.name}` : `Reactivate ${a.name}`}
                            title={a.active ? "Deactivate" : "Reactivate"}
                          >
                            <Power size={16} />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )
          ) : pending.length === 0 ? (
            <EmptyState title="Nothing pending" description="Booking requests that need admin approval will show up here." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Amenity</Th>
                  <Th>Resident</Th>
                  <Th>Unit</Th>
                  <Th>Date</Th>
                  <Th>Time</Th>
                  <Th>Fee</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {pending.map((b) => (
                  <Tr key={b.id}>
                    <Td className="font-medium">{b.amenities?.name ?? "—"}</Td>
                    <Td>{b.residents?.name ?? "—"}</Td>
                    <Td className="font-mono text-xs">{b.units ? `${b.units.block}-${b.units.unit_number}` : "—"}</Td>
                    <Td>{formatDate(b.booking_date)}</Td>
                    <Td>{b.start_time ? `${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5) ?? ""}` : "Full day"}</Td>
                    <Td>{b.fee_amount > 0 ? formatINR(b.fee_amount) : "Free"}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => decide(b, "confirmed")}
                          className="rounded-md p-1.5 text-stamp-600 hover:bg-stamp-100"
                          aria-label="Approve"
                          title="Approve"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => decide(b, "rejected")}
                          className="rounded-md p-1.5 text-rust-500 hover:bg-rust-100"
                          aria-label="Reject"
                          title="Reject"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit amenity" : "Add amenity"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="am-name">Name</Label>
            <Input id="am-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="am-type">Booking type</Label>
              <Select
                id="am-type"
                value={form.booking_type}
                onChange={(e) => setForm({ ...form, booking_type: e.target.value as BookingType })}
              >
                <option value="slot">Slot-based (gym, court)</option>
                <option value="full_day">Full day (hall, guest room)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="am-fee">Fee (₹, 0 = free)</Label>
              <Input
                id="am-fee"
                type="number"
                min={0}
                value={form.fee_amount}
                onChange={(e) => setForm({ ...form, fee_amount: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="am-capacity">Capacity (blank = unlimited)</Label>
              <Input
                id="am-capacity"
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            {form.booking_type === "slot" && (
              <div>
                <Label htmlFor="am-slot">Slot duration (minutes)</Label>
                <Input
                  id="am-slot"
                  type="number"
                  min={15}
                  value={form.slot_duration_minutes}
                  onChange={(e) => setForm({ ...form, slot_duration_minutes: e.target.value })}
                />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="am-open">Opens</Label>
              <Input id="am-open" type="time" value={form.open_time} onChange={(e) => setForm({ ...form, open_time: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="am-close">Closes</Label>
              <Input id="am-close" type="time" value={form.close_time} onChange={(e) => setForm({ ...form, close_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="am-advance">Advance booking window (days)</Label>
              <Input
                id="am-advance"
                type="number"
                min={0}
                value={form.advance_booking_days}
                onChange={(e) => setForm({ ...form, advance_booking_days: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="am-cutoff">Cancellation cutoff (hours)</Label>
              <Input
                id="am-cutoff"
                type="number"
                min={0}
                value={form.cancellation_cutoff_hours}
                onChange={(e) => setForm({ ...form, cancellation_cutoff_hours: Number(e.target.value) })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={form.requires_approval}
              onChange={(e) => setForm({ ...form, requires_approval: e.target.checked })}
            />
            Requires admin approval before confirming
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create amenity"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
