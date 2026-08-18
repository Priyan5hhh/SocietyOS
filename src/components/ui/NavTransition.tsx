import type { MouseEvent } from "react"
import { flushSync } from "react-dom"
import { Link, NavLink, useNavigate, type LinkProps, type NavLinkProps } from "react-router-dom"

/**
 * This app uses plain declarative <BrowserRouter>, not a data router
 * (createBrowserRouter), so React Router's built-in `viewTransition` prop
 * on Link/NavLink is a no-op here — it only works in framework/data mode.
 * This reimplements the same effect with the documented manual pattern:
 * wrap the navigation's state update in flushSync so it's applied
 * synchronously, then hand that to the native View Transition API so the
 * browser can crossfade between the before/after DOM snapshots.
 *
 * Falls through to a plain navigation when the browser doesn't support
 * View Transitions, or when the click was a modifier-click (new tab, etc.)
 * — never intercepts those.
 */
function shouldIntercept(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && typeof document.startViewTransition === "function"
}

// A transition's `ready`/`finished` promises reject (InvalidStateError) whenever
// a later transition supersedes it before it settles — expected under fast nav,
// but left uncaught it surfaces as an "Uncaught (in promise)" console error.
function runTransition(navigate: () => void) {
  const transition = document.startViewTransition(() => {
    flushSync(navigate)
  })
  transition.ready.catch(() => {})
  transition.finished.catch(() => {})
}

export function LinkTransition({ to, onClick, ...props }: LinkProps) {
  const navigate = useNavigate()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || !shouldIntercept(e)) return
    e.preventDefault()
    runTransition(() => navigate(to))
  }

  return <Link to={to} onClick={handleClick} {...props} />
}

export function NavLinkTransition({ to, onClick, ...props }: NavLinkProps) {
  const navigate = useNavigate()

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented || !shouldIntercept(e)) return
    e.preventDefault()
    runTransition(() => navigate(to))
  }

  return <NavLink to={to} onClick={handleClick} {...props} />
}
