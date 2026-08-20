import { useEffect } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/lib/AuthContext"
import { registerAppServiceWorker } from "@/lib/registerSW"
import Landing from "@/routes/Landing"
import Login from "@/routes/Login"
import Signup from "@/routes/Signup"
import ResidentLogin from "@/routes/ResidentLogin"
import { RequireAuth, RequirePlatformAuth, RequireResidentAuth } from "@/routes/RequireAuth"
import AdminLayout from "@/admin/AdminLayout"
import DashboardHome from "@/admin/pages/DashboardHome"
import ResidentRegistry from "@/admin/pages/ResidentRegistry"
import Billing from "@/admin/pages/Billing"
import TicketQueue from "@/admin/pages/TicketQueue"
import Notices from "@/admin/pages/Notices"
import Staff from "@/admin/pages/Staff"
import Subscription from "@/admin/pages/Subscription"
import VisitorAccountability from "@/admin/pages/VisitorAccountability"
import Amenities from "@/admin/pages/Amenities"
import IntakeReview from "@/admin/pages/IntakeReview"
import SecuritySignals from "@/admin/pages/SecuritySignals"
import Ledger from "@/admin/pages/Ledger"
import Defaulters from "@/admin/pages/Defaulters"
import AuditLog from "@/admin/pages/AuditLog"
import Documents from "@/admin/pages/Documents"
import Elections from "@/admin/pages/Elections"
import GuardLayout from "@/guard/GuardLayout"
import LogVisitor from "@/guard/pages/LogVisitor"
import VisitorLog from "@/guard/pages/VisitorLog"
import ActiveAlerts from "@/guard/pages/ActiveAlerts"
import PlatformAdmin from "@/platform/PlatformAdmin"
import FinanceLayout from "@/finance/FinanceLayout"
import FacilityLayout from "@/facility/FacilityLayout"
import FacilityTickets from "@/facility/pages/Tickets"
import FacilityVendors from "@/facility/pages/Vendors"
import FacilityAttendance from "@/facility/pages/Attendance"
import FacilityStaffList from "@/facility/pages/StaffList"
import WorkerNotice from "@/worker/WorkerNotice"
import ResidentHome from "@/resident/ResidentHome"
import ResidentDues from "@/resident/Dues"
import ResidentAmenities from "@/resident/Amenities"
import ResidentPreApprovals from "@/resident/PreApprovals"
import ResidentDocuments from "@/resident/Documents"
import ResidentVote from "@/resident/Vote"

function AppRoutes() {
  useEffect(() => {
    registerAppServiceWorker()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/resident/login" element={<ResidentLogin />} />

      <Route element={<RequireResidentAuth />}>
        <Route path="/resident" element={<ResidentHome />} />
        <Route path="/resident/dues" element={<ResidentDues />} />
        <Route path="/resident/amenities" element={<ResidentAmenities />} />
        <Route path="/resident/pre-approvals" element={<ResidentPreApprovals />} />
        <Route path="/resident/documents" element={<ResidentDocuments />} />
        <Route path="/resident/vote" element={<ResidentVote />} />
      </Route>

      <Route element={<RequireAuth role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="residents" element={<ResidentRegistry />} />
          <Route path="billing" element={<Billing />} />
          <Route path="tickets" element={<TicketQueue />} />
          <Route path="intake-review" element={<IntakeReview />} />
          <Route path="visitors" element={<VisitorAccountability />} />
          <Route path="security" element={<SecuritySignals />} />
          <Route path="alerts" element={<ActiveAlerts />} />
          <Route path="notices" element={<Notices />} />
          <Route path="amenities" element={<Amenities />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="defaulters" element={<Defaulters />} />
          <Route path="audit-log" element={<AuditLog />} />
          <Route path="documents" element={<Documents />} />
          <Route path="elections" element={<Elections />} />
          <Route path="staff" element={<Staff />} />
          <Route path="subscription" element={<Subscription />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="guard" />}>
        <Route path="/guard" element={<GuardLayout />}>
          <Route index element={<LogVisitor />} />
          <Route path="log" element={<VisitorLog />} />
          <Route path="alerts" element={<ActiveAlerts />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="finance" />}>
        <Route path="/finance" element={<FinanceLayout />}>
          <Route index element={<Billing />} />
          <Route path="subscription" element={<Subscription />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="facility" />}>
        <Route path="/facility" element={<FacilityLayout />}>
          <Route index element={<FacilityTickets />} />
          <Route path="vendors" element={<FacilityVendors />} />
          <Route path="attendance" element={<FacilityAttendance />} />
          <Route path="staff" element={<FacilityStaffList />} />
        </Route>
      </Route>

      <Route element={<RequireAuth role="worker" />}>
        <Route path="/worker" element={<WorkerNotice />} />
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
