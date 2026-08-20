import { useEffect, useState } from "react"
import { FileText, Upload, AlertCircle, Trash2, ExternalLink } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Stamp } from "@/components/ui/Stamp"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { uploadImage } from "@/lib/services/storage"
import { errorMessage } from "@/lib/utils"

interface DocRow {
  id: string
  unit_id: string | null
  title: string
  category: string
  imagekit_url: string
  visibility: "admin_only" | "unit_residents" | "all_residents"
  created_at: string
}

interface UnitLabel {
  id: string
  block: string
  unit_number: string
}

const categoryLabel: Record<string, string> = {
  bylaws: "Bylaws",
  agm_minutes: "AGM minutes",
  sale_deed: "Sale deed",
  lease_agreement: "Lease agreement",
  noc: "NOC",
  other: "Other",
}

const visibilityTone = { admin_only: "ink", unit_residents: "amber", all_residents: "stamp" } as const

/**
 * Document vault (item 13, doc-vault half) — admin upload/list over the new
 * `documents` table, reusing the existing ImageKit upload pattern. Visibility
 * controls whether residents can see it via `resident_list_documents`.
 */
export default function Documents() {
  const [docs, setDocs] = useState<DocRow[]>([])
  const [units, setUnits] = useState<UnitLabel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("bylaws")
  const [visibility, setVisibility] = useState<DocRow["visibility"]>("admin_only")
  const [unitId, setUnitId] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DocRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const [{ data: docData, error: dErr }, { data: unitData, error: uErr }] = await Promise.all([
        sb.from("documents").select("*").order("created_at", { ascending: false }),
        sb.from("units").select("id, block, unit_number").eq("society_id", societyId ?? ""),
      ])
      if (dErr) throw dErr
      if (uErr) throw uErr
      setDocs((docData ?? []) as DocRow[])
      setUnits((unitData ?? []) as UnitLabel[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load documents"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openModal() {
    setTitle("")
    setCategory("bylaws")
    setVisibility("admin_only")
    setUnitId("")
    setFile(null)
    setFormError(null)
    setModalOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setFormError("Choose a file to upload.")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const { societyId, staffId } = getStaffClaims()
      const uploaded = await uploadImage(file, "documents")
      const sb = getStaffSupabase()
      const { error: insErr } = await sb.from("documents").insert({
        society_id: societyId,
        unit_id: visibility === "unit_residents" ? unitId || null : null,
        title,
        category,
        imagekit_url: uploaded.url,
        imagekit_file_id: uploaded.fileId,
        visibility,
        uploaded_by_staff_id: staffId,
      })
      if (insErr) throw insErr
      setModalOpen(false)
      await load()
    } catch (err) {
      setFormError(errorMessage(err, "Failed to upload document"))
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      const sb = getStaffSupabase()
      const { error: delErr } = await sb.from("documents").delete().eq("id", confirmDelete.id)
      if (delErr) throw delErr
      setConfirmDelete(null)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to delete document"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Document Vault"
        description="Bylaws, AGM minutes, sale deeds, and lease agreements — scoped to admin, unit residents, or everyone."
        action={
          <Button onClick={openModal}>
            <Upload size={16} /> Upload document
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
            <TableSkeleton rows={5} cols={4} />
          </Card>
        ) : docs.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">
            <FileText size={24} className="mx-auto mb-2 text-ink-300" />
            No documents uploaded yet.
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Documents ({docs.length})</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <Thead>
                  <tr>
                    <Th>Title</Th>
                    <Th>Category</Th>
                    <Th>Visibility</Th>
                    <Th>Uploaded</Th>
                    <Th></Th>
                  </tr>
                </Thead>
                <Tbody>
                  {docs.map((d) => (
                    <Tr key={d.id}>
                      <Td className="font-medium">
                        <a href={d.imagekit_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
                          <FileText size={14} className="text-ink-400" /> {d.title} <ExternalLink size={11} className="text-ink-300" />
                        </a>
                      </Td>
                      <Td className="text-ink-500">{categoryLabel[d.category] ?? d.category}</Td>
                      <Td>
                        <Stamp tone={visibilityTone[d.visibility]}>{d.visibility.replace("_", " ")}</Stamp>
                      </Td>
                      <Td className="text-ink-500">{formatDate(d.created_at)}</Td>
                      <Td>
                        <button type="button" onClick={() => setConfirmDelete(d)} className="text-ink-400 hover:text-rust-600" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload document">
        <form onSubmit={submit} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-2.5 text-xs text-rust-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}
          <div>
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Society Bylaws 2026" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doc-category">Category</Label>
              <Select id="doc-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.entries(categoryLabel).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="doc-visibility">Visibility</Label>
              <Select id="doc-visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as DocRow["visibility"])}>
                <option value="admin_only">Admin only</option>
                <option value="unit_residents">One unit's residents</option>
                <option value="all_residents">All residents</option>
              </Select>
            </div>
          </div>
          {visibility === "unit_residents" && (
            <div>
              <Label htmlFor="doc-unit">Unit</Label>
              <Select id="doc-unit" required value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                <option value="">Select a unit…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.block}-{u.unit_number}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="doc-file">File</Label>
            <input
              id="doc-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-700 file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete document">
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            Permanently delete <strong>{confirmDelete?.title}</strong>? This can't be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setConfirmDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
