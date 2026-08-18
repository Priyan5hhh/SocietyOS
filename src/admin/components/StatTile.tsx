import type { ReactNode } from "react"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "ink",
}: {
  label: string
  value: string
  hint?: string
  icon: ReactNode
  tone?: "ink" | "stamp" | "amber" | "rust"
}) {
  const toneClass = {
    ink: "bg-ink-100 text-ink-700",
    stamp: "bg-stamp-100 text-stamp-700",
    amber: "bg-amber-100 text-amber-700",
    rust: "bg-rust-100 text-rust-700",
  }[tone]

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
          <div className="mt-2 font-mono text-2xl font-semibold text-ink-900">{value}</div>
          {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>{icon}</div>
      </div>
    </Card>
  )
}
