import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { api } from "@/lib/services/api"

export type TicketPriority = "low" | "medium" | "high"

export interface TicketDraftForm {
  unit_id: string
  resident_name: string
  message: string
  category: string
  priority: TicketPriority
  description: string
}

interface Unit {
  id: string
  block: string
  unit_number: string
}

function emptyForm(): TicketDraftForm {
  return { unit_id: "", resident_name: "", message: "", category: "other", priority: "medium", description: "" }
}

interface TicketDraftState {
  open: boolean
  minimized: boolean
  units: Unit[]
  unitsLoading: boolean
  form: TicketDraftForm
  aiLoading: boolean
  aiNote: string | null
  saving: boolean
  error: string | null
}

interface TicketDraftContextValue extends TicketDraftState {
  openNew: () => void
  close: () => void
  minimize: () => void
  maximize: () => void
  setField: (patch: Partial<TicketDraftForm>) => void
  runAiAssist: () => Promise<void>
  save: () => Promise<void>
}

const TicketDraftContext = createContext<TicketDraftContextValue | null>(null)

export const TICKET_CREATED_EVENT_NAME = "societyos:ticket-created"

export function TicketDraftProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TicketDraftState>({
    open: false,
    minimized: false,
    units: [],
    unitsLoading: false,
    form: emptyForm(),
    aiLoading: false,
    aiNote: null,
    saving: false,
    error: null,
  })

  // Mirrors `state.form` for synchronous reads inside async handlers below,
  // so runAiAssist/save always send what's on screen right now rather than
  // a value captured by a stale closure at the time the handler was created.
  const formRef = useRef(state.form)

  const setField = useCallback((patch: Partial<TicketDraftForm>) => {
    setState((s) => {
      const form = { ...s.form, ...patch }
      formRef.current = form
      return { ...s, form }
    })
  }, [])

  const openNew = useCallback(() => {
    const form = emptyForm()
    formRef.current = form
    setState((s) => ({ ...s, open: true, minimized: false, form, aiNote: null, error: null, unitsLoading: true }))
    api
      .get<{ units: Unit[] }>("/api/units")
      .then(({ units }) => setState((s) => ({ ...s, units, unitsLoading: false })))
      .catch(() => setState((s) => ({ ...s, unitsLoading: false })))
  }, [])

  const close = useCallback(() => {
    const form = emptyForm()
    formRef.current = form
    setState((s) => ({ ...s, open: false, minimized: false, form, aiNote: null, error: null }))
  }, [])

  const minimize = useCallback(() => setState((s) => ({ ...s, minimized: true })), [])
  const maximize = useCallback(() => setState((s) => ({ ...s, minimized: false })), [])

  const runAiAssist = useCallback(async () => {
    if (!formRef.current.message.trim()) return
    setState((s) => ({ ...s, aiLoading: true, aiNote: null }))
    try {
      const { draft, ai_provider } = await api.post<{
        draft: { category: string; subcategory: string | null; priority: TicketPriority; description: string }
        ai_provider: string
      }>("/api/tickets/ai-extract", { message: formRef.current.message })
      const form = { ...formRef.current, category: draft.category, priority: draft.priority, description: draft.description }
      formRef.current = form
      setState((s) => ({ ...s, form, aiLoading: false, aiNote: `Filled by AI (${ai_provider})` }))
    } catch {
      setState((s) => ({ ...s, aiLoading: false, aiNote: "AI suggestion unavailable — fill in manually." }))
    }
  }, [])

  const save = useCallback(async () => {
    setState((s) => ({ ...s, saving: true, error: null }))
    try {
      const current = formRef.current
      const { ticket } = await api.post<{ ticket: unknown }>("/api/tickets", {
        unit_id: current.unit_id || null,
        resident_name: current.resident_name || null,
        category: current.category,
        priority: current.priority,
        description: current.description || current.message,
      })
      window.dispatchEvent(new CustomEvent(TICKET_CREATED_EVENT_NAME, { detail: ticket }))
      const form = emptyForm()
      formRef.current = form
      setState((s) => ({ ...s, open: false, minimized: false, saving: false, form, aiNote: null }))
    } catch (err) {
      setState((s) => ({ ...s, saving: false, error: err instanceof Error ? err.message : "Failed to create ticket" }))
    }
  }, [])

  return (
    <TicketDraftContext.Provider value={{ ...state, openNew, close, minimize, maximize, setField, runAiAssist, save }}>
      {children}
    </TicketDraftContext.Provider>
  )
}

export function useTicketDraft() {
  const ctx = useContext(TicketDraftContext)
  if (!ctx) throw new Error("useTicketDraft must be used within TicketDraftProvider")
  return ctx
}
