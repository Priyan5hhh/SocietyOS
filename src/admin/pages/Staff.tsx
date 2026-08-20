import { useEffect, useState } from "react"
import { Plus, AlertCircle, Pencil, Trash2, Power } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { formatDate } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { errorMessage } from "@/lib/utils"

type StaffRole = "admin" | "guard" | "finance" | "facility" | "worker"

interface StaffMember {
  id: string
  name: string
  role: StaffRole
  phone: string | null
  active: boolean
  created_at: string
}

const roleLabel: Record<StaffRole, string> = {
  admin: "Admin / Accountant",
  guard: "Security Guard",
  finance: "Finance / Treasurer",
  facility: "Facility Manager",
  worker: "Worker (plumber, electrician, etc.)",
}

const roleTone: Record<StaffRole, "stamp" | "ink" | "amber" | "rust"> = {
  admin: "stamp",
  guard: "ink",
  finance: "amber",
  facility: "amber",
  worker: "ink",
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6).toUpperCase() + "!1"
}

function emptyForm() {
  return { name: "", email: "", role: "guard" as StaffRole, password: randomPassword(), phone: "" }
}

export default function Staff() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<StaffMember | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<StaffMember | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { staff } = await api.get<{ staff: StaffMember[] }>("/api/staff")
      setStaff(staff)
    } catch (err) {
      setError(errorMessage(err, "Failed to load staff"))
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
    setCreatedCreds(null)
    setModalOpen(true)
  }

  function openEdit(s: StaffMember) {
    setEditing(s)
    setForm({ name: s.name, email: "", role: s.role, password: "", phone: s.phone ?? "" })
    setCreatedCreds(null)
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        const { staff: updated } = await api.patch<{ staff: StaffMember }>(`/api/staff/${editing.id}`, {
          name: form.name,
          phone: form.phone || null,
          role: form.role,
        })
        setStaff((prev) => prev.map((s) => (s.id === editing.id ? updated : s)))
        setModalOpen(false)
      } else {
        await api.post("/api/staff", { ...form, phone: form.phone || null })
        setCreatedCreds({ email: form.email, password: form.password })
        await load()
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to save staff member"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(s: StaffMember) {
    setError(null)
    try {
      const { staff: updated } = await api.patch<{ staff: StaffMember }>(`/api/staff/${s.id}`, { active: !s.active })
      setStaff((prev) => prev.map((x) => (x.id === s.id ? updated : x)))
    } catch (err) {
      setError(errorMessage(err, "Failed to update staff member"))
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    setError(null)
    try {
      await api.delete(`/api/staff/${confirmDelete.id}`)
      setStaff((prev) => prev.filter((s) => s.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      setError(errorMessage(err, "Failed to delete staff member"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Everyone with access to this society's portals — admins, guards, finance, facility, and workers."
        action={
          <Button onClick={openAdd}>
            <Plus size={16} /> Add staff
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

        <Card>
          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {staff.map((s) => (
                  <Tr key={s.id} className={!s.active ? "opacity-50" : undefined}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td>
                      <Stamp tone={roleTone[s.role]}>{s.role}</Stamp>
                    </Td>
                    <Td className="text-ink-500">{s.phone ?? "—"}</Td>
                    <Td>
                      <Stamp tone={s.active ? "stamp" : "rust"}>{s.active ? "Active" : "Inactive"}</Stamp>
                    </Td>
                    <Td className="text-ink-500">{formatDate(s.created_at)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={`Edit ${s.name}`}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(s)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={s.active ? `Deactivate ${s.name}` : `Reactivate ${s.name}`}
                          title={s.active ? "Deactivate" : "Reactivate"}
                        >
                          <Power size={16} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(s)}
                          className="rounded-md p-1.5 text-rust-500 hover:bg-rust-100 hover:text-rust-700"
                          aria-label={`Delete ${s.name}`}
                          title="Delete permanently"
                        >
                          <Trash2 size={16} />
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit staff" : "Add staff"}>
        {createdCreds ? (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              Account created. Share these credentials with them — this password won't be shown again.
            </p>
            <div className="rounded-lg border border-ink-100 bg-paper-100 p-4 font-mono text-sm">
              <div>{createdCreds.email}</div>
              <div>{createdCreds.password}</div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label htmlFor="st-name">Full name</Label>
              <Input id="st-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing && (
              <div>
                <Label htmlFor="st-email">Email</Label>
                <Input
                  id="st-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label htmlFor="st-phone">Phone</Label>
              <Input
                id="st-phone"
                type="tel"
                placeholder="+91 98xxx xxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="st-role">Role</Label>
              <Select id="st-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
                <option value="guard">{roleLabel.guard}</option>
                <option value="admin">{roleLabel.admin}</option>
                <option value="finance">{roleLabel.finance}</option>
                <option value="facility">{roleLabel.facility}</option>
                <option value="worker">{roleLabel.worker}</option>
              </Select>
            </div>
            {!editing && (
              <div>
                <Label htmlFor="st-password">Temporary password</Label>
                <Input
                  id="st-password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <p className="mt-1 text-xs text-ink-500">Auto-generated — feel free to change it.</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create account"}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete staff member">
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            Permanently delete <strong>{confirmDelete?.name}</strong>? This removes their login entirely and can't be undone.
            To just remove their access while keeping their name on past records, use Deactivate instead.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
