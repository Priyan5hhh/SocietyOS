import { useCallback, useEffect, useRef, useState } from "react"
import { HelpCircle, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { useClickOutside } from "@/lib/hooks/useClickOutside"

interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

/**
 * AI help chat — one component, two shells: "sidebar" is a nav-style row
 * with the panel to the right; "header" is a bare icon button with the
 * panel dropping down below.
 */
export function HelpChatWidget({
  variant,
  collapsed = false,
}: {
  variant: "sidebar" | "header"
  collapsed?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const closePanel = useCallback(() => setOpen(false), [])
  const containerRef = useClickOutside<HTMLDivElement>(open, closePanel)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [turns, loading])

  async function send() {
    const message = input.trim()
    if (!message || loading) return
    setInput("")
    setError(null)
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: message }]
    setTurns(nextTurns)
    setLoading(true)
    try {
      const { reply } = await api.post<{ reply: string }>("/api/help/chat", {
        message,
        history: turns.slice(-10),
      })
      setTurns((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI help is unavailable right now.")
    } finally {
      setLoading(false)
    }
  }

  const panel = open && (
    <div
      className={cn(
        "animate-modal-in absolute z-50 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-paper-0 shadow-2xl",
        variant === "sidebar" ? "bottom-0 left-full ml-2 origin-bottom-left" : "right-0 top-full mt-2 origin-top-right",
      )}
    >
      <div className="border-b border-ink-100 px-4 py-3">
        <div className="text-sm font-semibold text-ink-900">Help</div>
        <div className="text-xs text-ink-500">Ask where to find something, or how a feature works.</div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {turns.length === 0 && (
          <p className="text-sm text-ink-500">
            Try asking: "how do I bulk import residents?" or "where do I add staff?"
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-xl px-3 py-2 text-sm",
              t.role === "user" ? "ml-auto bg-chrome-900 text-white" : "bg-paper-100 text-ink-900",
            )}
          >
            {t.content}
          </div>
        ))}
        {loading && <div className="max-w-[85%] rounded-xl bg-paper-100 px-3 py-2 text-sm text-ink-500">Thinking…</div>}
        {error && <div className="text-xs text-rust-600">{error}</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
        className="flex items-center gap-2 border-t border-ink-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="h-9 flex-1 rounded-lg border border-ink-100 bg-paper-0 px-3 text-sm outline-none focus:border-ink-300"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-chrome-900 text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )

  if (variant === "header") {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close help" : "Open help"}
          className="rounded-md p-1.5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <HelpCircle size={18} />
        </button>
        {panel}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={collapsed ? "Help" : undefined}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-300 transition-colors hover:bg-white/5 hover:text-white",
          collapsed && "justify-center px-0",
        )}
      >
        <HelpCircle size={20} className="shrink-0" />
        {!collapsed && "Help"}
      </button>
      {panel}
    </div>
  )
}
