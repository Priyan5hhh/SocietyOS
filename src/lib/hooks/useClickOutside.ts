import { useEffect, useRef } from "react"

/**
 * Closes a floating panel (help chat, theme picker, …) when the user clicks
 * anywhere outside the element this ref is attached to — including the
 * trigger button, since it's expected to live inside the same wrapper.
 */
export function useClickOutside<T extends HTMLElement>(active: boolean, onOutside: () => void) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!active) return
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [active, onOutside])

  return ref
}
