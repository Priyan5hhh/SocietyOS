import { useEffect, useRef } from "react"

/**
 * Subtle scroll-linked vertical drift for a background image — the element
 * moves slower than the page, standard parallax feel. Transform-based (not
 * background-attachment:fixed, which iOS Safari doesn't support). Skipped
 * entirely under prefers-reduced-motion.
 */
export function useParallax<T extends HTMLElement>(strength = 0.15) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let ticking = false
    function update() {
      ticking = false
      if (!el) return
      const rect = el.getBoundingClientRect()
      const offset = (rect.top - window.innerHeight / 2) * strength
      el.style.transform = `translateY(${offset}px) scale(1.15)`
    }
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [strength])

  return ref
}
