import { useCallback, useEffect, useRef, useState } from "react"
import { MessageCircle, Send, X, UserRound } from "lucide-react"
import { cn, errorMessage } from "@/lib/utils"
import { api } from "@/lib/services/api"
import { useClickOutside } from "@/lib/hooks/useClickOutside"
import { CONTACT } from "@/routes/landing-data"

interface ChatTurn {
  role: "user" | "assistant"
  content: string
}

const SUGGESTIONS = ["How does the WhatsApp part work?", "What does it cost?", "How do I sign my society up?"]

/**
 * Floating "ask a question" widget for anonymous landing-page visitors —
 * hits the public, unauthenticated /api/public/inquiry-chat endpoint (rate
 * limited server-side), not the logged-in-only /api/help/chat used inside
 * the dashboard. Same click-outside-to-close pattern as HelpChatWidget.
 */
export function PublicHelpChatWidget() {
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

  async function send(message: string) {
    const text = message.trim()
    if (!text || loading) return
    setInput("")
    setError(null)
    const nextTurns: ChatTurn[] = [...turns, { role: "user", content: text }]
    setTurns(nextTurns)
    setLoading(true)
    try {
      const { reply } = await api.post<{ reply: string }>("/api/public/inquiry-chat", {
        message: text,
        history: turns.slice(-8),
      })
      setTurns((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (err) {
      setError(errorMessage(err, "Chat is unavailable right now."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="animate-modal-in absolute bottom-16 right-0 flex h-[28rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-ink-100 bg-paper-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-ink-900">Ask about SocietyOS</div>
              <div className="text-xs text-ink-500">Pricing, features, how it works</div>
            </div>
            <button
              onClick={closePanel}
              aria-label="Close chat"
              className="rounded-md p-1 text-ink-300 hover:bg-paper-100 hover:text-ink-700"
            >
              <X size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-ink-500">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-ink-100 px-3 py-2 text-left text-sm text-ink-700 hover:border-ink-300 hover:bg-paper-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
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
              send(input)
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

          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center justify-center gap-1.5 border-t border-ink-100 py-2 text-xs font-medium text-ink-500 hover:text-ink-900"
          >
            <UserRound size={13} /> Talk to a person instead
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask a question"}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-chrome-900 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}
