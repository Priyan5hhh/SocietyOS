import { useEffect, useRef } from "react"
import { gsap, SplitText, ensureGsapRegistered } from "@/lib/gsapConfig"

/** Headline that splits into words and staggers up into place as it scrolls into view (GSAP SplitText + ScrollTrigger). */
export function SplitReveal({ text, className, as: Tag = "h2" }: { text: string; className?: string; as?: "h1" | "h2" | "h3" }) {
  const ref = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    ensureGsapRegistered()

    let split: SplitText | undefined
    const ctx = gsap.context(() => {
      split = new SplitText(el, { type: "words", mask: "words" })
      gsap.set(split.words, { yPercent: 110, opacity: 0 })
      gsap.to(split.words, {
        yPercent: 0,
        opacity: 1,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      })
    }, el)

    return () => {
      ctx.revert()
      split?.revert()
    }
  }, [text])

  return (
    <Tag ref={ref as never} className={className}>
      {text}
    </Tag>
  )
}
