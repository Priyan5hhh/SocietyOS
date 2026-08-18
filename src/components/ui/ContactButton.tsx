import { useCallback, useState } from "react"
import { Phone, Mail, MessageSquareText } from "lucide-react"
import { useClickOutside } from "@/lib/hooks/useClickOutside"
import { CONTACT } from "@/routes/landing-data"

/**
 * Separate from the AI chatbot — a plain "reach a human" entry point.
 * Sits to the left of the chat bubble so the two never overlap. Call/
 * WhatsApp have no real number yet, so they're shown but disabled with a
 * "coming soon" note rather than linking to a fake destination.
 */
export function ContactButton() {
  const [open, setOpen] = useState(false)
  const closePanel = useCallback(() => setOpen(false), [])
  const containerRef = useClickOutside<HTMLDivElement>(open, closePanel)

  return (
    <div ref={containerRef} className="fixed bottom-6 right-24 z-50">
      {open && (
        <div className="animate-modal-in absolute bottom-16 right-0 w-64 rounded-2xl border border-ink-100 bg-paper-0 p-2 shadow-2xl">
          <div className="px-2 py-2 text-xs font-semibold uppercase tracking-widest text-ink-500">Reach a person</div>
          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-paper-100"
          >
            <Mail size={16} className="shrink-0 text-ink-500" />
            <span>
              Email us
              <span className="block text-xs text-ink-500">{CONTACT.email}</span>
            </span>
          </a>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-300">
            <MessageSquareText size={16} className="shrink-0" />
            <span>
              WhatsApp
              <span className="block text-xs">Coming soon</span>
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-300">
            <Phone size={16} className="shrink-0" />
            <span>
              Call
              <span className="block text-xs">Coming soon</span>
            </span>
          </div>
          <div className="border-t border-ink-100 px-3 pt-2 text-xs text-ink-500">We reply within 24 hours.</div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close contact options" : "Contact us"}
        title="Contact us"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-ink-100 bg-paper-0 text-ink-700 shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Phone size={20} />
      </button>
    </div>
  )
}
