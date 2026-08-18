import { cn } from "@/lib/utils"

export type StampTone = "stamp" | "amber" | "rust" | "ink"

const tones: Record<StampTone, string> = {
  stamp: "border-stamp-600 text-stamp-700",
  amber: "border-amber-600 text-amber-700",
  rust: "border-rust-600 text-rust-700",
  ink: "border-ink-500 text-ink-700",
}

/**
 * The signature UI element: a status marker styled like a ledger-book ink stamp —
 * double-ruled border, uppercase tracked type, a faint counter-rotation.
 * Used anywhere a record needs a verified/pending/overdue state at a glance.
 */
export function Stamp({
  children,
  tone = "ink",
  className,
}: {
  children: React.ReactNode
  tone?: StampTone
  className?: string
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
        "border-2 rounded-[3px] -rotate-1 select-none",
        "before:content-[''] before:absolute before:inset-[2px] before:border before:border-current before:opacity-40 before:rounded-[2px]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
