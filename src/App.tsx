import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/lib/AuthContext"
import { registerGuardServiceWorker } from "@/lib/registerSW"
import Landing from "@/routes/Landing"
import Login from "@/routes/Login"
import Signup from "@/routes/Signup"
import { RequireAuth, RequirePlatformAuth } from "@/routes/RequireAuth"
import AdminLayout from "@/admin/AdminLayout"
import DashboardHome from "@/admin/pages/DashboardHome"
import ResidentRegistry from "@/admin/pages/ResidentRegistry"
import Billing from "@/admin/pages/Billing"
import TicketQueue from "@/admin/pages/TicketQueue"
import Notices from "@/admin/pages/Notices"
import Staff from "@/admin/pages/Staff"
import GuardLayout from "@/guard/GuardLayout"
import LogVisitor from "@/guard/pages/LogVisitor"
import VisitorLog from "@/guard/pages/VisitorLog"
import PlatformAdmin from "@/platform/PlatformAdmin"

function AppRoutes() {
  useEffect(() => {
    registerGuardServiceWorker()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="residents" element={<ResidentRegistry />} />
          <Route path="billing" element={<Billing />} />
          <Route path="tickets" element={<TicketQueue />} />
          <Route path="notices" element={<Notices />} />
          <Route path="staff" element={<Staff />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="guard" />}>
        <Route path="/guard" element={<GuardLayout />}>
          <Route index element={<LogVisitor />} />
          <Route path="log" element={<VisitorLog />} />
        </Route>
      </Route>

      <Route element={<RequirePlatformAuth />}>
        <Route path="/platform" element={<PlatformAdmin />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
