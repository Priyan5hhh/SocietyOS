import { useEffect, useState } from "react"
import { Camera, Search, CheckCircle2, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select, Textarea } from "@/components/ui/Input"
import { Stamp } from "@/components/ui/Stamp"
import { CameraCapture } from "@/components/ui/CameraCapture"
import { uploadImage } from "@/lib/services/storage"
import { api } from "@/lib/services/api"
import { useNavigate } from "react-router-dom"
import { errorMessage } from "@/lib/utils"

type VisitorPurpose = "guest" | "delivery" | "cab" | "service" | "other"

const purposes: { value: VisitorPurpose; label: string }[] = [
  { value: "guest", label: "Guest" },
  { value: "delivery", label: "Delivery" },
  { value: "cab", label: "Cab / Auto" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
]

interface Unit {
  id: string
  block: string
  unit_number: string
}

interface PreApproval {
  id: string
  guest_name: string
  guest_phone: string | null
  unit_id: string
  units: { block: string; unit_number: string } | null
}

export default function LogVisitor() {
  const navigate = useNavigate()

  const [units, setUnits] = useState<Unit[]>([])
  const [preApprovals, setPreApprovals] = useState<PreApproval[]>([])

  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFileId, setPhotoFileId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [unitId, setUnitId] = useState("")
  const [purpose, setPurpose] = useState<VisitorPurpose>("guest")
  const [matched, setMatched] = useState<PreApproval | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ units: Unit[] }>("/api/units").then((r) => setUnits(r.units)).catch(() => {})
    api
      .get<{ pre_approvals: PreApproval[] }>("/api/pre-approvals?active=true")
      .then((r) => setPreApprovals(r.pre_approvals))
      .catch(() => {})
  }, [])

  async function handleCapture(file: File) {
    setCameraOpen(false)
    setUploading(true)
    try {
      const { url, fileId } = await uploadImage(file, "visitor-photos")
      setPhotoUrl(url)
      setPhotoFileId(fileId)
    } finally {
      setUploading(false)
    }
  }

  function lookupPreApproval() {
    const query = phone.replace(/\s/g, "")
    const hit = preApprovals.find(
      (p) => (p.guest_phone ?? "").replace(/\s/g, "") === query || p.guest_name.toLowerCase() === name.toLowerCase(),
    )
    if (hit) {
      setMatched(hit)
      setName(hit.guest_name)
      setUnitId(hit.unit_id)
      setPurpose("guest")
    } else {
      setMatched(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post("/api/visitors", {
        name,
        phone,
        purpose,
        unit_id: unitId || null,
        photo_imagekit_url: photoUrl,
        photo_imagekit_file_id: photoFileId,
      })
      setSavedToast(true)
      setTimeout(() => navigate("/guard/log"), 900)
    } catch (err) {
      setError(errorMessage(err, "Failed to log visitor"))
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="mb-4 text-lg font-semibold text-ink-900">Log a visitor</h1>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo capture */}
        <div>
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="Visitor" className="h-56 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhotoUrl(null)
                  setPhotoFileId(null)
                }}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-chrome-950/60 text-white"
                aria-label="Retake photo"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              disabled={uploading}
              className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 bg-paper-100 text-ink-500 active:bg-paper-200"
            >
              <Camera size={32} />
              <span className="text-sm font-medium">{uploading ? "Uploading…" : "Tap to take live photo"}</span>
            </button>
          )}
        </div>

        {cameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setCameraOpen(false)} />}

        {/* Pre-approval lookup */}
        <div>
          <Label htmlFor="v-phone">Phone number</Label>
          <div className="flex gap-2">
            <Input
              id="v-phone"
              inputMode="tel"
              placeholder="+91 9xxxx xxxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-13 text-base"
            />
            <Button type="button" variant="secondary" size="lg" onClick={lookupPreApproval} aria-label="Check pre-approval">
              <Search size={20} />
            </Button>
          </div>
        </div>

        {matched && (
          <div className="flex items-start gap-2 rounded-lg border-2 border-stamp-500 bg-stamp-100 p-3">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-stamp-700" />
            <div className="text-sm text-stamp-700">
              Pre-approved for{" "}
              <strong>{matched.units ? `${matched.units.block}-${matched.units.unit_number}` : "unit"}</strong> —
              expected today.
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="v-name">Visitor name</Label>
          <Input
            id="v-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="h-13 text-base"
          />
        </div>

        <div>
          <Label htmlFor="v-unit">Visiting unit</Label>
          <Select id="v-unit" required value={unitId} onChange={(e) => setUnitId(e.target.value)} className="h-13">
            <option value="">Select unit…</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.block}-{u.unit_number}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label>Purpose</Label>
          <div className="grid grid-cols-3 gap-2">
            {purposes.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className={`rounded-lg border-2 px-2 py-3 text-sm font-medium transition-colors ${
                  purpose === p.value ? "border-ink-900 bg-ink-100/50 text-ink-900" : "border-ink-100 text-ink-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="v-notes">Notes (optional)</Label>
          <Textarea id="v-notes" placeholder="Vehicle number, extra context…" className="text-base" />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Logging entry…" : "Log entry"}
        </Button>
      </form>

      {savedToast && (
        <div className="animate-modal-in fixed inset-x-4 bottom-24 z-50 flex items-center gap-2 rounded-xl bg-chrome-900 px-4 py-3 text-sm text-white shadow-lg">
          <Stamp tone="stamp" className="border-white text-white">
            Logged
          </Stamp>
          Visitor entry saved.
        </div>
      )}
    </div>
  )
}
