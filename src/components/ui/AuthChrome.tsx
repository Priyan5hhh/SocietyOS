import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { LinkTransition } from "@/components/ui/NavTransition"

/**
 * Shared shell for the auth screens' form column — a minimal header (back
 * to the marketing site) and footer (copyright, legal placeholders) around
 * whatever form the page passes in. Kept out of AuthHero since the hero is
 * full-bleed and this chrome belongs to the form side only.
 */
export function AuthChrome({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col px-6 py-6">
      <LinkTransition to="/" className="flex items-center gap-1.5 self-start text-sm font-medium text-ink-500 hover:text-ink-900">
        <ArrowLeft size={15} /> Back to SocietyOS
      </LinkTransition>

      <div className="flex flex-1 items-center justify-center py-6">{children}</div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center font-mono text-[11px] text-ink-300">
        <span>© {new Date().getFullYear()} SocietyOS</span>
        <span className="cursor-default" title="Coming soon">
          Privacy Policy
        </span>
        <span className="cursor-default" title="Coming soon">
          Terms of Service
        </span>
      </div>
    </div>
  )
}
