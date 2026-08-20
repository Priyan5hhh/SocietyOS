import { Ticket, Wrench, CalendarCheck, UserCog } from "lucide-react"
import { PortalLayout } from "@/components/ui/PortalLayout"
import { TicketDraftProvider } from "@/admin/context/TicketDraftContext"
import { FloatingTicketPanel } from "@/admin/components/FloatingTicketPanel"

const nav = [
  { to: "/facility", label: "Ticket Queue", icon: Ticket, end: true },
  { to: "/facility/vendors", label: "Vendors", icon: Wrench },
  { to: "/facility/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/facility/staff", label: "Staff", icon: UserCog },
]

export default function FacilityLayout() {
  return (
    <TicketDraftProvider>
      <PortalLayout nav={nav} roleLabel="Facility Manager" />
      <FloatingTicketPanel />
    </TicketDraftProvider>
  )
}
