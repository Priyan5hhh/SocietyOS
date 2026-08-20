import { useEffect, useState } from "react"
import { Plus, AlertCircle, Pencil, Power, Bell } from "lucide-react"
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

interface Vendor {
  id: string
  name: string
  category: string | null
  phone: string | null
  contract_type: "ad_hoc" | "amc"
  amc_start_date: string | null
  amc_end_date: string | null
  amc_amount: number | null
  notes: string | null
  active: boolean
  created_at: string
}

function emptyForm() {
  return {
    name: "",
    category: "",
    phone: "",
    contract_type: "ad_hoc" as "ad_hoc" | "amc",
    amc_start_date: "",
    amc_end_date: "",
    amc_amount: "",
    notes: "",
  }
}

const AMC_RENEWAL_WARNING_DAYS = 30

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { data, error: err } = await sb.from("vendors").select("*").order("name")
      if (err) throw err
      setVendors((data ?? []) as Vendor[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load vendors"))
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

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm({
      name: v.name,
      category: v.category ?? "",
      phone: v.phone ?? "",
      contract_type: v.contract_type,
      amc_start_date: v.amc_start_date ?? "",
      amc_end_date: v.amc_end_date ?? "",
      amc_amount: v.amc_amount != null ? String(v.amc_amount) : "",
      notes: v.notes ?? "",
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
        category: form.category || null,
        phone: form.phone || null,
        contract_type: form.contract_type,
        amc_start_date: form.contract_type === "amc" && form.amc_start_date ? form.amc_start_date : null,
        amc_end_date: form.contract_type === "amc" && form.amc_end_date ? form.amc_end_date : null,
        amc_amount: form.contract_type === "amc" && form.amc_amount ? Number(form.amc_amount) : null,
        notes: form.notes || null,
      }
      if (editing) {
        const { error: upErr } = await sb.from("vendors").update(payload).eq("id", editing.id)
        if (upErr) throw upErr
      } else {
        const { societyId } = getStaffClaims()
        const { error: insErr } = await sb.from("vendors").insert({ ...payload, society_id: societyId })
        if (insErr) throw insErr
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to save vendor"))
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(v: Vendor) {
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { error: upErr } = await sb.from("vendors").update({ active: !v.active }).eq("id", v.id)
      if (upErr) throw upErr
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to update vendor"))
    }
  }

  function renewalDue(v: Vendor) {
    if (v.contract_type !== "amc" || !v.amc_end_date) return false
    const days = (new Date(v.amc_end_date).getTime() - Date.now()) / 86_400_000
    return days <= AMC_RENEWAL_WARNING_DAYS
  }

  return (
    <div>
      <PageHeader
        title="Vendors"
        description="Vendors and AMC (annual maintenance contract) records for this society."
        action={
          <Button onClick={openAdd}>
            <Plus size={16} /> Add vendor
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
            <TableSkeleton rows={4} cols={6} />
          ) : vendors.length === 0 ? (
            <EmptyState title="No vendors yet" description="Add plumbers, electricians, pest control, elevator AMC, etc." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Phone</Th>
                  <Th>Contract</Th>
                  <Th>AMC renewal</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </Thead>
              <Tbody>
                {vendors.map((v) => (
                  <Tr key={v.id} className={!v.active ? "opacity-50" : undefined}>
                    <Td className="font-medium">{v.name}</Td>
                    <Td className="text-ink-500">{v.category ?? "—"}</Td>
                    <Td className="text-ink-500">{v.phone ?? "—"}</Td>
                    <Td>
                      <Stamp tone={v.contract_type === "amc" ? "amber" : "ink"}>
                        {v.contract_type === "amc" ? "AMC" : "Ad hoc"}
                      </Stamp>
                    </Td>
                    <Td>
                      {v.contract_type === "amc" && v.amc_end_date ? (
                        <span className={`flex items-center gap-1.5 ${renewalDue(v) ? "text-rust-600 font-medium" : "text-ink-500"}`}>
                          {renewalDue(v) && <Bell size={12} />}
                          {formatDate(v.amc_end_date)}
                          {v.amc_amount != null && <span className="text-ink-400"> · {formatINR(v.amc_amount)}</span>}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Stamp tone={v.active ? "stamp" : "rust"}>{v.active ? "Active" : "Inactive"}</Stamp>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(v)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={`Edit ${v.name}`}
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => toggleActive(v)}
                          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
                          aria-label={v.active ? `Deactivate ${v.name}` : `Reactivate ${v.name}`}
                          title={v.active ? "Deactivate" : "Reactivate"}
                        >
                          <Power size={16} />
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit vendor" : "Add vendor"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="v-name">Name</Label>
            <Input id="v-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="v-category">Category</Label>
              <Input
                id="v-category"
                placeholder="Plumbing, Elevator AMC…"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="v-phone">Phone</Label>
              <Input id="v-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="v-contract">Contract type</Label>
            <Select
              id="v-contract"
              value={form.contract_type}
              onChange={(e) => setForm({ ...form, contract_type: e.target.value as "ad_hoc" | "amc" })}
            >
              <option value="ad_hoc">Ad hoc / on call</option>
              <option value="amc">AMC (annual maintenance contract)</option>
            </Select>
          </div>
          {form.contract_type === "amc" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="v-start">AMC start</Label>
                  <Input
                    id="v-start"
                    type="date"
                    value={form.amc_start_date}
                    onChange={(e) => setForm({ ...form, amc_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="v-end">AMC end (renewal due)</Label>
                  <Input
                    id="v-end"
                    type="date"
                    value={form.amc_end_date}
                    onChange={(e) => setForm({ ...form, amc_end_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="v-amount">AMC amount (₹)</Label>
                <Input
                  id="v-amount"
                  type="number"
                  min={0}
                  value={form.amc_amount}
                  onChange={(e) => setForm({ ...form, amc_amount: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <Label htmlFor="v-notes">Notes</Label>
            <Input id="v-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add vendor"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
