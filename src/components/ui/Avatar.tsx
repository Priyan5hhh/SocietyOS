import { cn } from "@/lib/utils"

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase()
}

export function Avatar({
  name,
  photoUrl,
  className,
}: {
  name: string
  photoUrl?: string | null
  className?: string
}) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={cn("h-9 w-9 shrink-0 rounded-full object-cover", className)}
      />
    )
  }
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700",
        className,
      )}
    >
      {initials(name)}
    </div>
  )
}
