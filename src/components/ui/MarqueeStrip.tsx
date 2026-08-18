import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Infinite auto-scrolling horizontal strip — the content array is rendered
 * twice back to back and the whole track slides left by exactly 50% of its
 * width in a loop, so the seam is invisible. Keeps running under the
 * cursor (never pauses on hover); a plain static row under
 * prefers-reduced-motion.
 */
export function MarqueeStrip({
  items,
  reverse = false,
  durationS = 34,
  className,
}: {
  items: ReactNode[]
  reverse?: boolean
  durationS?: number
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div
        className={cn("flex w-max gap-5", reverse ? "animate-marquee-reverse" : "animate-marquee")}
        style={{ animationDuration: `${durationS}s` }}
      >
        {[...items, ...items].map((item, i) => (
          <div key={i} className="shrink-0">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}
