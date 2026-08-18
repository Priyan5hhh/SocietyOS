export function registerGuardServiceWorker() {
  if (!("serviceWorker" in navigator)) return
  if (!window.location.pathname.startsWith("/guard")) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  })
}
