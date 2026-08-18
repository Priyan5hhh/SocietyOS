import { useEffect, useRef } from "react"
import { Check, CheckCheck } from "lucide-react"
import { Stamp } from "@/components/ui/Stamp"
import { gsap, ensureGsapRegistered } from "@/lib/gsapConfig"

/**
 * Custom WhatsApp-style phone mockup (green bubble UI, no logo/trademark)
 * scroll-animated into a ledger entry card — the page's one canonical
 * "this is literally a WhatsApp message becoming a register entry" visual.
 * GSAP ScrollTrigger scrubs the sequence to scroll position so it plays
 * out as the section comes into view rather than firing once on mount.
 */
export function WhatsAppToLedger() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    ensureGsapRegistered()

    const ctx = gsap.context(() => {
      gsap.set([phoneRef.current, bubbleRef.current], { opacity: 0, y: 24 })
      gsap.set(arrowRef.current, { opacity: 0 })
      gsap.set(cardRef.current, { opacity: 0, y: 24, scale: 0.96 })

      const tl = gsap.timeline({
        scrollTrigger: { trigger: section, start: "top 75%", end: "top 20%", scrub: 0.5 },
      })
      tl.to(phoneRef.current, { opacity: 1, y: 0, duration: 0.3 })
        .to(bubbleRef.current, { opacity: 1, y: 0, duration: 0.3 }, "-=0.05")
        .to(arrowRef.current, { opacity: 1, duration: 0.2 })
        .to(cardRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.4 })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={sectionRef} className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-10" aria-hidden="true">
      {/* phone frame with a WhatsApp-style (green bubble) chat — visual language only, no logo */}
      <div ref={phoneRef} className="w-full max-w-[240px] shrink-0 rounded-[2rem] border-4 border-ink-900 bg-ink-900 p-1.5 shadow-xl">
        <div className="overflow-hidden rounded-[1.5rem] bg-[#e9edc9]">
          <div className="flex items-center gap-2 bg-[#128C7E] px-3 py-2.5">
            <div className="h-6 w-6 shrink-0 rounded-full bg-white/30" />
            <div>
              <div className="text-xs font-semibold text-white">Sunrise Residency</div>
              <div className="text-[10px] text-white/80">online</div>
            </div>
          </div>
          <div ref={bubbleRef} className="min-h-[110px] space-y-2 px-2.5 py-3">
            <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#DCF8C6] px-2.5 py-1.5 shadow-sm">
              <p className="text-[11px] leading-snug text-ink-900">
                Leak under the kitchen sink, water spreading fast — please send someone urgently 🙏
              </p>
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-ink-500">
                10:42 AM <CheckCheck size={11} className="text-[#34B7F1]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={arrowRef} className="text-2xl text-ink-300 lg:rotate-0">
        →
      </div>

      {/* the same message, now a register entry */}
      <div ref={cardRef} className="w-full max-w-sm rounded-2xl border border-ink-100 bg-paper-0 p-4 shadow-[0_8px_24px_rgba(16,39,63,0.1)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="font-mono text-xs text-ink-500">A-402</span>{" "}
            <span className="text-sm font-semibold text-ink-900">Anita Deshmukh</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-ink-500">
              <Check size={12} className="text-stamp-600" /> Plumbing · logged just now
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Stamp tone="rust">High</Stamp>
            <Stamp tone="rust">New</Stamp>
          </div>
        </div>
      </div>
    </div>
  )
}
