import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Small non-blocking "AI is working" indicator — a corner pill, not a
 * full-screen spinner, so the rest of the page stays usable while an AI
 * call is in flight.
 */
export function AiPill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-stamp-200 bg-stamp-50 px-3 py-1 text-xs font-medium text-stamp-700",
        className,
      )}
    >
      <Sparkles size={12} className="animate-pulse" />
      {label}
    </span>
  )
}
