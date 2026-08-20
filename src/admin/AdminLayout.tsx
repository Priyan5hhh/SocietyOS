import { useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { LinkTransition, NavLinkTransition } from "@/components/ui/NavTransition"
import {
  LayoutDashboard,
  Users,
  Receipt,
  Ticket,
  Megaphone,
  LogOut,
  UserCog,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  CreditCard,
  CalendarDays,
  SearchCheck,
  ShieldAlert,
  BookOpen,
  AlertTriangle,
  ScrollText,
  FileText,
  Vote,
  Siren,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Avatar } from "@/components/ui/Avatar"
import { HelpChatWidget } from "@/components/ui/HelpChatWidget"
import { TicketDraftProvider } from "@/admin/context/TicketDraftContext"
import { FloatingTicketPanel } from "@/admin/components/FloatingTicketPanel"
import { Logo } from "@/components/ui/Logo"
import { cn } from "@/lib/utils"

const nav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/residents", label: "Resident Registry", icon: Users },
  { to: "/admin/billing", label: "Billing", icon: Receipt },
  { to: "/admin/tickets", label: "Ticket Queue", icon: Ticket },
  { to: "/admin/intake-review", label: "Intake Review", icon: SearchCheck },
  { to: "/admin/visitors", label: "Visitor Accountability", icon: ShieldCheck },
  { to: "/admin/security", label: "Security Signals", icon: ShieldAlert },
  { to: "/admin/alerts", label: "Active Alerts", icon: Siren },
  { to: "/admin/notices", label: "Notices", icon: Megaphone },
  { to: "/admin/amenities", label: "Amenities", icon: CalendarDays },
  { to: "/admin/ledger", label: "Ledger", icon: BookOpen },
  { to: "/admin/defaulters", label: "Defaulters", icon: AlertTriangle },
  { to: "/admin/audit-log", label: "Audit Log", icon: ScrollText },
  { to: "/admin/documents", label: "Documents", icon: FileText },
  { to: "/admin/elections", label: "Elections", icon: Vote },
  { to: "/admin/staff", label: "Staff", icon: UserCog },
  { to: "/admin/subscription", label: "Subscription", icon: CreditCard },
]

const SIDEBAR_STORAGE_KEY = "societyos-sidebar-collapsed"

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
}

export default function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const name = session?.kind === "staff" ? session.name : ""
  const [collapsed, setCollapsed] = useState(readStoredCollapsed)

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <TicketDraftProvider>
      <div className="flex min-h-screen bg-paper-50">
        <aside
          className={cn(
            "vt-app-sidebar sticky top-0 flex h-screen shrink-0 flex-col border-r border-ink-100 bg-chrome-900 transition-[width] duration-200",
            collapsed ? "w-[76px]" : "w-64",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center px-4",
              collapsed ? "flex-col justify-center gap-2 py-3" : "justify-between",
            )}
          >
            <LinkTransition to="/" title="Go to homepage" className="flex items-center gap-2 rounded-md">
              <Logo size={28} />
              {!collapsed && (
                <span className="font-serif text-base font-semibold tracking-tight text-white">SocietyOS</span>
              )}
            </LinkTransition>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="shrink-0 rounded-md p-1 text-ink-300 transition-colors hover:text-white"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLinkTransition
                key={to}
                to={to}
                end={end}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive ? "bg-white/10 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <Icon size={22} className="shrink-0" />
                {!collapsed && label}
              </NavLinkTransition>
            ))}
          </nav>

          <div className={cn("space-y-1 border-t border-white/10 px-3 py-3", collapsed && "px-2")}>
            <HelpChatWidget variant="sidebar" collapsed={collapsed} />
          </div>

          <div className={cn("border-t border-white/10 px-3 py-4", collapsed && "px-2")}>
            <div className={cn("flex items-center gap-3 rounded-lg px-2 py-2", collapsed && "flex-col gap-2 px-0")}>
              <Avatar name={name || "Admin"} />
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">{name || "Admin"}</div>
                  <div className="text-xs text-ink-300">Administrator</div>
                </div>
              )}
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
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">
            <Outlet />
          </div>
          <footer className="vt-app-footer border-t border-ink-100 px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-ink-300">
              <span>© {new Date().getFullYear()} SocietyOS</span>
              <span className="flex items-center gap-4">
                <span className="cursor-default" title="Coming soon">
                  Privacy Policy
                </span>
                <span className="cursor-default" title="Coming soon">
                  Terms of Service
                </span>
                <a href="mailto:contact@societyos.app" className="hover:text-ink-500">
                  contact@societyos.app
                </a>
              </span>
            </div>
          </footer>
        </main>
        <FloatingTicketPanel />
      </div>
    </TicketDraftProvider>
  )
}
