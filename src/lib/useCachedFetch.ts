import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Module-level cache — survives component unmount/remount (e.g. navigating
 * away from a page and back), but not a full page reload. Used for AI
 * endpoints that are expensive/slow to recompute: fetch once per session,
 * and only recompute when the caller explicitly calls `refresh()`.
 */
const cache = new Map<string, unknown>()

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled ?? true
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const [data, setData] = useState<T | null>(() => (cache.has(key) ? (cache.get(key) as T) : null))
  const [loading, setLoading] = useState(!cache.has(key))
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (force = false) => {
      if (!force && cache.has(key)) {
        setData(cache.get(key) as T)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const result = await fetcherRef.current()
        cache.set(key, result)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        setLoading(false)
      }
    },
    [key],
  )

  useEffect(() => {
    // `enabled` lets a caller delay the first run until a real prerequisite
    // (e.g. another list finishing its own load) is actually ready, instead
    // of computing once uselessly and only getting it right on refresh.
    if (!enabled) return
    load()
  }, [load, enabled])

  const refresh = useCallback(() => load(true), [load])

  return { data, loading, error, refresh }
}
