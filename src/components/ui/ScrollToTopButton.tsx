import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

/** Appears once the page has scrolled past one viewport height; smooth-scrolls back to top. */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > window.innerHeight * 0.6)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      title="Back to top"
      className="animate-fade-in fixed bottom-6 left-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-ink-100 bg-paper-0 text-ink-700 shadow-[0_6px_20px_rgba(0,0,0,0.15)] transition-transform hover:-translate-y-0.5 hover:text-ink-900 active:scale-95"
    >
      <ArrowUp size={18} />
    </button>
  )
}
