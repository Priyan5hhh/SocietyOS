import { useEffect, useMemo, useState } from "react"
import { Plus, Search, Pencil, AlertCircle, UploadCloud, AlertTriangle, Send, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Avatar } from "@/components/ui/Avatar"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { EmptyState } from "@/components/ui/EmptyState"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { NoResidentsIllustration } from "@/components/illustrations"
import { BulkSetupModal } from "@/admin/components/BulkSetupModal"
import { formatDate } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { errorMessage } from "@/lib/utils"

interface Unit {
  id: string
  block: string
  unit_number: string
}

interface Resident {
  id: string
  name: string
  phone: string
  unit_id: string
  is_owner: boolean
  members_count: number
  photo_imagekit_url: string | null
  joined_at: string
  units: { block: string; unit_number: string } | null
  portal_invited_at?: string | null
  portal_activated_at?: string | null
}

interface ResidentForm {
  name: string
  phone: string
  block: string
  unit_number: string
  is_owner: boolean
  members_count: number
}

function emptyForm(): ResidentForm {
  return { name: "", phone: "", block: "", unit_number: "", is_owner: true, members_count: 1 }
}

export default function ResidentRegistry() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [query, setQuery] = useState("")
  const [blockFilter, setBlockFilter] = useState("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [editing, setEditing] = useState<Resident | null>(null)
  const [form, setForm] = useState<ResidentForm>(emptyForm())

  const [inviting, setInviting] = useState<Resident | null>(null)
  const [inviteSaving, setInviteSaving] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [residentsRes, unitsRes] = await Promise.all([
        api.get<{ residents: Resident[] }>("/api/residents"),
        api.get<{ units: Unit[] }>("/api/units"),
      ])
      setResidents(residentsRes.residents)
      setUnits(unitsRes.units)
    } catch (err) {
      setError(errorMessage(err, "Failed to load residents"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const blocks = useMemo(() => Array.from(new Set(units.map((u) => u.block))).sort(), [units])

  // Deterministic (not AI) duplicate check: same last-8-digits phone as an
  // existing resident, excluding whichever resident is currently being
  // edited. Exact-match comparisons like this are more reliable and
  // instant than an AI call, so this stays a plain heuristic.
  const duplicateWarning = useMemo(() => {
    const digits = form.phone.replace(/\D/g, "")
    if (digits.length < 8) return null
    const tail = digits.slice(-8)
    const match = residents.find((r) => r.id !== editing?.id && r.phone.replace(/\D/g, "").slice(-8) === tail)
    if (!match) return null
    return `Possible duplicate — ${match.name} (${match.units ? `${match.units.block}-${match.units.unit_number}` : "no unit"}) uses a similar number.`
  }, [form.phone, residents, editing])

  const filtered = residents.filter((r) => {
    const unitLabel = r.units ? `${r.units.block}-${r.units.unit_number}` : ""
    const matchesQuery =
      r.name.toLowerCase().includes(query.toLowerCase()) || unitLabel.toLowerCase().includes(query.toLowerCase())
    const matchesBlock = blockFilter === "all" || r.units?.block === blockFilter
    return matchesQuery && matchesBlock
  })

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  function openEdit(r: Resident) {
    setEditing(r)
    setForm({
      name: r.name,
      phone: r.phone,
      block: r.units?.block ?? "",
      unit_number: r.units?.unit_number ?? "",
      is_owner: r.is_owner,
      members_count: r.members_count,
    })
    setModalOpen(true)
  }

  /** Finds the unit for (block, unit_number), creating it if it doesn't exist yet. */
  async function resolveUnitId(block: string, unitNumber: string): Promise<string> {
    const existing = units.find((u) => u.block === block && u.unit_number === unitNumber)
    if (existing) return existing.id
    const { unit } = await api.post<{ unit: Unit }>("/api/units", { block, unit_number: unitNumber })
    setUnits((prev) => [...prev, unit])
    return unit.id
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const unitId = await resolveUnitId(form.block, form.unit_number)
      const payload = {
        unit_id: unitId,
        name: form.name,
        phone: form.phone,
        is_owner: form.is_owner,
        members_count: form.members_count,
      }
      if (editing) {
        const { resident } = await api.patch<{ resident: Resident }>(`/api/residents/${editing.id}`, payload)
        setResidents((prev) => prev.map((r) => (r.id === editing.id ? resident : r)))
      } else {
        const { resident } = await api.post<{ resident: Resident }>("/api/residents", payload)
        setResidents((prev) => [{ ...resident, units: { block: form.block, unit_number: form.unit_number } }, ...prev])
      }
      setModalOpen(false)
    } catch (err) {
      setError(errorMessage(err, "Failed to save resident"))
    } finally {
      setSaving(false)
    }
  }

  async function handleInvite(r: Resident) {
    setInviteSaving(true)
    setInviteError(null)
    try {
      const { resident } = await api.post<{ resident: Resident }>(`/api/residents/${r.id}/invite`)
      setResidents((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...resident } : x)))
      setInviting((prev) => (prev ? { ...prev, ...resident } : prev))
    } catch (err) {
      setInviteError(errorMessage(err, "Failed to invite resident to the portal"))
    } finally {
      setInviteSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Resident Registry"
        description={loading ? "Loading…" : `${residents.length} residents across ${blocks.length} blocks`}
        action={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setBulkModalOpen(true)}>
              <UploadCloud size={16} /> Bulk setup
            </Button>
            <Button onClick={openAdd}>
              <Plus size={16} /> Add resident
            </Button>
          </div>
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or unit…"
              className="pl-9"
            />
          </div>
          <Select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)} className="w-40">
            <option value="all">All blocks</option>
            {blocks.map((b) => (
              <option key={b} value={b}>
                Block {b}
              </option>
            ))}
          </Select>
        </div>

        <Card>
          {loading ? (
            <TableSkeleton rows={5} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration={<NoResidentsIllustration />}
              title="No residents found"
              description="Try a different search or add the first resident to this society."
              action={
                <Button onClick={openAdd} variant="secondary">
                  <Plus size={16} /> Add resident
                </Button>
              }
            />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Resident</Th>
                  <Th>Unit</Th>
                  <Th>Phone</Th>
                  <Th>Type</Th>
                  <Th>Members</Th>
                  <Th>Since</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {filtered.map((r) => (
                  <Tr key={r.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} photoUrl={r.photo_imagekit_url} />
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">
                      {r.units ? `${r.units.block}-${r.units.unit_number}` : "—"}
                    </Td>
                    <Td className="font-mono text-xs text-ink-500">{r.phone}</Td>
                    <Td>
                      <Stamp tone={r.is_owner ? "stamp" : "ink"}>{r.is_owner ? "Owner" : "Tenant"}</Stamp>
                    </Td>
                    <Td>{r.members_count}</Td>
                    <Td className="text-ink-500">{formatDate(r.joined_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setInviting(r)
                            setInviteError(null)
                          }}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={
                            r.portal_invited_at ? `Portal invite status for ${r.name}` : `Invite ${r.name} to portal`
                          }
                          title={r.portal_invited_at ? "Portal access enabled" : "Invite to portal"}
                        >
                          {r.portal_invited_at ? (
                            <CheckCircle2 size={16} className="text-stamp-600" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={`Edit ${r.name}`}
                        >
                          <Pencil size={16} />
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit resident" : "Add resident"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="res-name">Full name</Label>
            <Input id="res-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="res-block">Block</Label>
              <Input
                id="res-block"
                required
                placeholder="e.g. A"
                value={form.block}
                onChange={(e) => setForm({ ...form, block: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="res-unit">Unit number</Label>
              <Input
                id="res-unit"
                required
                placeholder="e.g. 402"
                value={form.unit_number}
                onChange={(e) => setForm({ ...form, unit_number: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="res-phone">Phone (WhatsApp)</Label>
            <Input
              id="res-phone"
              required
              placeholder="+91 98xxx xxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            {duplicateWarning && (
              <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                {duplicateWarning}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="res-type">Ownership</Label>
              <Select
                id="res-type"
                value={form.is_owner ? "owner" : "tenant"}
                onChange={(e) => setForm({ ...form, is_owner: e.target.value === "owner" })}
              >
                <option value="owner">Owner</option>
                <option value="tenant">Tenant</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="res-members">Household members</Label>
              <Input
                id="res-members"
                type="number"
                min={1}
                value={form.members_count}
                onChange={(e) => setForm({ ...form, members_count: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add resident"}
            </Button>
          </div>
        </form>
      </Modal>

      <BulkSetupModal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)} onDone={loadAll} knownBlocks={blocks} />

      <Modal open={!!inviting} onClose={() => setInviting(null)} title="Invite to portal">
        {inviting && (
          <div className="space-y-4">
            {inviteError && (
              <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {inviteError}
              </div>
            )}
            {inviting.portal_invited_at ? (
              <div className="flex items-start gap-2 rounded-lg border-2 border-stamp-500 bg-stamp-100 p-3 text-sm text-stamp-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <div>
                  Portal access enabled for <strong>{inviting.name}</strong>. They can now log in with{" "}
                  <span className="font-mono">{inviting.phone}</span> at{" "}
                  <span className="font-mono">/resident/login</span>.
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-700">
                This flips on phone+OTP login for <strong>{inviting.name}</strong> using the number already on file (
                <span className="font-mono">{inviting.phone}</span>). No approval queue — since you already vouched
                for this resident by adding them here, this is the only step needed.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setInviting(null)}>
                {inviting.portal_invited_at ? "Done" : "Cancel"}
              </Button>
              {!inviting.portal_invited_at && (
                <Button type="button" onClick={() => handleInvite(inviting)} disabled={inviteSaving}>
                  {inviteSaving ? "Inviting…" : "Invite to portal"}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
