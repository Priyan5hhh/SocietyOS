import { Receipt, CreditCard } from "lucide-react"
import { PortalLayout } from "@/components/ui/PortalLayout"

const nav = [
  { to: "/finance", label: "Billing", icon: Receipt, end: true },
  { to: "/finance/subscription", label: "Subscription", icon: CreditCard },
]

export default function FinanceLayout() {
  return <PortalLayout nav={nav} roleLabel="Finance / Treasurer" />
}
