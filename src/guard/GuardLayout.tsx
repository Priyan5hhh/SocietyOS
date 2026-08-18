import { Outlet, useNavigate } from "react-router-dom"
import { UserPlus, ListChecks, LogOut } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { HelpChatWidget } from "@/components/ui/HelpChatWidget"
import { Logo } from "@/components/ui/Logo"
import { NavLinkTransition } from "@/components/ui/NavTransition"

export default function GuardLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const name = session?.kind === "staff" ? session.name : ""

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper-50">
      <header className="vt-app-header flex h-14 shrink-0 items-center justify-between border-b border-ink-100 bg-chrome-900 px-4">
        <div className="flex items-center gap-2">
          <Logo size={24} />
          <span className="font-serif text-sm font-semibold tracking-tight text-white">Gate Desk</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs text-ink-300">{name}</span>
          <HelpChatWidget variant="header" />
          <button onClick={handleLogout} aria-label="Log out" className="rounded-md p-1.5 text-ink-300 active:bg-white/10">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto pb-20">
        <Outlet />
        <footer className="vt-app-footer px-4 pb-4 pt-2 text-center font-mono text-[10px] text-ink-300">
          SocietyOS Gate Desk · © {new Date().getFullYear()}
        </footer>
      </main>

      <nav className="vt-app-bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-20 border-t border-ink-100 bg-paper-0 [padding-bottom:env(safe-area-inset-bottom)]">
        <NavLinkTransition
          to="/guard"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
              isActive ? "text-ink-900" : "text-ink-300"
            }`
          }
        >
          <UserPlus size={26} />
          Log visitor
        </NavLinkTransition>
        <NavLinkTransition
          to="/guard/log"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
              isActive ? "text-ink-900" : "text-ink-300"
            }`
          }
        >
          <ListChecks size={26} />
          Visitor log
        </NavLinkTransition>
      </nav>
    </div>
  )
}
