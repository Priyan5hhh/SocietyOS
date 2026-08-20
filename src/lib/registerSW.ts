/**
 * PWA installability — originally guard-only ("SocietyOS Gate Desk" at
 * /guard). Phase 4 extends the same service worker + a second, role-scoped
 * manifest to /resident so residents can "Add to Home Screen" too. Also
 * swaps the <link rel="manifest"> tag to match whichever role's route the
 * page loaded on, since a single static manifest link can't be role-aware.
 */
const INSTALLABLE_PREFIXES = ["/guard", "/resident"] as const

export function registerAppServiceWorker() {
  setManifestForCurrentPath()

  if (!("serviceWorker" in navigator)) return
  if (!INSTALLABLE_PREFIXES.some((p) => window.location.pathname.startsWith(p))) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  })
}

function setManifestForCurrentPath() {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (!link) return
  link.href = window.location.pathname.startsWith("/resident") ? "/resident-manifest.webmanifest" : "/manifest.webmanifest"
}

// Back-compat alias — keep old name working in case anything else imports it.
export const registerGuardServiceWorker = registerAppServiceWorker
