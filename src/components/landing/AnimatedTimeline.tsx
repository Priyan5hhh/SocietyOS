import { useEffect, useRef } from "react"
import { gsap, ensureGsapRegistered } from "@/lib/gsapConfig"
import { cn } from "@/lib/utils"
import type { steps } from "@/routes/landing-data"

/** The "How it works" connector line draws itself left-to-right on scroll, lighting up each step's icon node as it reaches it. */
export function AnimatedTimeline({ items }: { items: typeof steps }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const container = containerRef.current
    const line = lineRef.current
    if (!container || !line) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    ensureGsapRegistered()

    const nodes = nodeRefs.current.filter((n): n is HTMLDivElement => !!n)
    const ctx = gsap.context(() => {
      gsap.set(line, { scaleX: 0, transformOrigin: "left center" })
      nodes.forEach((n) => gsap.set(n, { backgroundColor: "var(--color-paper-0)", color: "var(--color-ink-700)" }))

      const tl = gsap.timeline({
        scrollTrigger: { trigger: container, start: "top 70%", end: "bottom 60%", scrub: 0.5 },
      })
      tl.to(line, { scaleX: 1, duration: 1, ease: "none" })
      nodes.forEach((n, i) => {
        tl.to(
          n,
          { backgroundColor: "var(--color-ink-900)", color: "#fff", duration: 0.15 },
          i / nodes.length,
        )
      })
    }, container)

    return () => ctx.revert()
  }, [items.length])

  return (
    <div ref={containerRef} className="relative">
      <div className="absolute left-0 right-0 top-7 hidden h-px bg-ink-100 md:block" aria-hidden="true" />
      <div ref={lineRef} className="absolute left-0 right-0 top-7 hidden h-px bg-ink-900 md:block" aria-hidden="true" />
      <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3">
        {items.map((s, i) => (
          <div key={s.n} style={{ transitionDelay: `${i * 100}ms` }}>
            <div
              ref={(el) => {
                nodeRefs.current[i] = el
              }}
              className={cn("flex h-14 w-14 items-center justify-center rounded-full border border-ink-100 bg-paper-0 text-ink-700 shadow-[0_2px_6px_rgba(16,39,63,0.08)]")}
            >
              <s.icon size={22} />
            </div>
            <div className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">Step {s.n}</div>
            <h3 className="mt-1.5 font-serif text-xl font-semibold text-ink-900">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
