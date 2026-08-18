import { Sparkles, Minus, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input, Label, Select, Textarea } from "@/components/ui/Input"
import { useTicketDraft } from "@/admin/context/TicketDraftContext"

/**
 * Non-blocking "new ticket" panel — a corner card, not a full-screen modal.
 * There's no backdrop, so the rest of the app stays clickable/scrollable
 * while this is open, and it can be minimized to a small pill so the admin
 * can navigate to other pages while AI-assist or the save request is in
 * flight, then come back to confirm.
 */
export function FloatingTicketPanel() {
  const draft = useTicketDraft()

  if (!draft.open) return null

  if (draft.minimized) {
    return (
      <button
        type="button"
        onClick={draft.maximize}
        className="fixed bottom-5 right-24 z-40 flex items-center gap-2 rounded-full border border-ink-100 bg-paper-0 px-4 py-2.5 text-sm font-medium text-ink-900 shadow-lg hover:bg-paper-100"
      >
        <Sparkles size={14} className="text-stamp-600" />
        New ticket draft
        {draft.aiLoading && <span className="text-xs text-ink-500">— AI working…</span>}
      </button>
    )
  }

  return (
    <div className="fixed bottom-5 right-24 z-40 flex max-h-[85vh] w-96 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-paper-0 shadow-2xl">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <span className="text-sm font-semibold text-ink-900">New ticket</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={draft.minimize}
            aria-label="Minimize"
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={draft.close}
            aria-label="Close"
            className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100/60 hover:text-ink-900"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          draft.save()
        }}
        className="flex-1 space-y-4 overflow-y-auto p-4"
      >
        {draft.error && (
          <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-2.5 text-xs text-rust-700">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            {draft.error}
          </div>
        )}

        <div>
          <Label htmlFor="ftk-message">Resident's message</Label>
          <Textarea
            id="ftk-message"
            rows={3}
            placeholder="Paste or type what the resident said…"
            value={draft.form.message}
            onChange={(e) => draft.setField({ message: e.target.value })}
          />
          <button
            type="button"
            onClick={draft.runAiAssist}
            disabled={draft.aiLoading || !draft.form.message.trim()}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-stamp-600 hover:underline disabled:opacity-50"
          >
            <Sparkles size={14} /> {draft.aiLoading ? "Thinking… (up to a minute)" : "AI-assist: fill category & priority"}
          </button>
          {draft.aiNote && <p className="mt-1 text-xs text-ink-500">{draft.aiNote}</p>}
        </div>

        <div>
          <Label htmlFor="ftk-unit">Unit</Label>
          <Select
            id="ftk-unit"
            value={draft.form.unit_id}
            onChange={(e) => draft.setField({ unit_id: e.target.value })}
            disabled={draft.unitsLoading}
          >
            <option value="">Unassigned</option>
            {draft.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.block}-{u.unit_number}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="ftk-resident">Resident name</Label>
          <Input
            id="ftk-resident"
            value={draft.form.resident_name}
            onChange={(e) => draft.setField({ resident_name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ftk-category">Category</Label>
            <Select id="ftk-category" value={draft.form.category} onChange={(e) => draft.setField({ category: e.target.value })}>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="security">Security</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="noise">Noise</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ftk-priority">Priority</Label>
            <Select
              id="ftk-priority"
              value={draft.form.priority}
              onChange={(e) => draft.setField({ priority: e.target.value as typeof draft.form.priority })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="ftk-description">Ticket description</Label>
          <Textarea
            id="ftk-description"
            rows={3}
            required
            value={draft.form.description}
            onChange={(e) => draft.setField({ description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={draft.close}>
            Cancel
          </Button>
          <Button type="submit" disabled={draft.saving}>
            {draft.saving ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </form>
    </div>
  )
}
