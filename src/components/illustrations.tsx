/**
 * Illustration layer — swap point for Higgsfield AI.
 *
 * Real implementation later: generate a branded illustration per key below via the
 * Higgsfield API (consistent style prompt: flat ledger/registry motif, ink-navy +
 * stamp-green palette) and swap the inline SVG for an <img src={cdnUrl} />.
 *
 * Kept as lightweight inline SVGs for now so empty states aren't bare admin-template gaps.
 */

import { cn } from "@/lib/utils"

function Base({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      className={cn("h-28 w-auto", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

export function NoTicketsIllustration({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="30" y="20" width="100" height="80" rx="6" className="fill-paper-100 stroke-ink-200" strokeWidth="1.5" />
      <path d="M44 40h72M44 54h72M44 68h48" className="stroke-ink-300" strokeWidth="2" strokeLinecap="round" />
      <circle cx="112" cy="82" r="20" className="fill-stamp-100 stroke-stamp-500" strokeWidth="1.5" />
      <path d="M104 82l6 6 12-12" className="stroke-stamp-600" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Base>
  )
}

export function NoResidentsIllustration({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="60" cy="42" r="16" className="fill-ink-100 stroke-ink-300" strokeWidth="1.5" />
      <path d="M34 92c0-16 12-26 26-26s26 10 26 26" className="fill-paper-100 stroke-ink-300" strokeWidth="1.5" />
      <rect x="96" y="60" width="34" height="34" rx="4" className="fill-amber-100 stroke-amber-500" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M105 77h16M113 69v16" className="stroke-amber-600" strokeWidth="2" strokeLinecap="round" />
    </Base>
  )
}

export function NoNoticesIllustration({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="26" y="24" width="76" height="70" rx="4" className="fill-paper-100 stroke-ink-200" strokeWidth="1.5" />
      <path d="M38 40h52M38 52h52M38 64h30" className="stroke-ink-300" strokeWidth="2" strokeLinecap="round" />
      <path d="M112 30l14 14-38 38-16 4 4-16z" className="fill-stamp-100 stroke-stamp-600" strokeWidth="1.5" strokeLinejoin="round" />
    </Base>
  )
}

export function NoVisitorsIllustration({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="24" y="30" width="60" height="60" rx="6" className="fill-paper-100 stroke-ink-200" strokeWidth="1.5" />
      <circle cx="54" cy="52" r="10" className="fill-ink-100 stroke-ink-300" strokeWidth="1.5" />
      <path d="M38 78c0-9 7-15 16-15s16 6 16 15" className="fill-paper-100 stroke-ink-300" strokeWidth="1.5" />
      <path d="M98 44l24 24M122 44l-24 24" className="stroke-rust-500" strokeWidth="2.5" strokeLinecap="round" />
    </Base>
  )
}
