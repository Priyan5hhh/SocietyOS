import { Outlet, useNavigate } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { LogOut } from "lucide-react"
import { LinkTransition, NavLinkTransition } from "@/components/ui/NavTransition"
import { useAuth } from "@/lib/auth-context"
import { Avatar } from "@/components/ui/Avatar"
import { Logo } from "@/components/ui/Logo"
import { cn } from "@/lib/utils"

export interface PortalNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

/**
 * Shared shell for the smaller, single-purpose portals (Finance, Facility) —
 * same look as AdminLayout's sidebar, but without the ticket-draft panel or
 * collapse state, since these portals have 1-2 nav items and don't need it.
 */
export function PortalLayout({ nav, roleLabel }: { nav: PortalNavItem[]; roleLabel: string }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const name = session?.kind === "staff" ? session.name : ""

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen bg-paper-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-ink-100 bg-chrome-900">
        <div className="flex h-16 items-center justify-between px-4">
          <LinkTransition to="/" title="Go to homepage" className="flex items-center gap-2 rounded-md">
            <Logo size={28} />
            <span className="font-serif text-base font-semibold tracking-tight text-white">SocietyOS</span>
          </LinkTransition>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLinkTransition
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <Icon size={22} className="shrink-0" />
              {label}
            </NavLinkTransition>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={name || roleLabel} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">{name || roleLabel}</div>
              <div className="text-xs text-ink-300">{roleLabel}</div>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="rounded-md p-1.5 text-ink-300 hover:bg-white/10 hover:text-white"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
