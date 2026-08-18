import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Full-bleed autoplay/muted/looping background video with a dark gradient overlay for readable text on top. */
export function VideoHero({
  src,
  poster,
  heightClass = "h-[64vh] min-h-[460px]",
  children,
  className,
}: {
  src: string
  poster?: string
  heightClass?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("relative overflow-hidden", heightClass, className)}>
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={src}
        poster={poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-ink-950/20" />
      <div className="relative mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
    </section>
  )
}
