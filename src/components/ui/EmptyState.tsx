import type { ReactNode } from "react"

export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {illustration}
      <h3 className="mt-4 text-sm font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-ink-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
