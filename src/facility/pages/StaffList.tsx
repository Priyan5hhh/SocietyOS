import { useEffect, useState } from "react"
import { AlertCircle } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { Stamp } from "@/components/ui/Stamp"
import { errorMessage, formatDate } from "@/lib/utils"
import { getStaffSupabase } from "@/lib/services/supabase"

type StaffRole = "admin" | "guard" | "finance" | "facility" | "worker"

interface StaffMember {
  id: string
  name: string
  role: StaffRole
  phone: string | null
  active: boolean
  created_at: string
}

const roleLabel: Record<StaffRole, string> = {
  admin: "Admin / Accountant",
  guard: "Security Guard",
  finance: "Finance / Treasurer",
  facility: "Facility Manager",
  worker: "Worker (plumber, electrician, etc.)",
}

/**
 * Read-only staff directory for facility managers — same underlying data as
 * Admin → Staff, but no add/edit/delete/deactivate actions. RLS
 * (staff_users_select_same_society_admin) already permits the 'facility'
 * role to read staff_users for its own society, so this queries Supabase
 * directly rather than routing through societyos-api's admin-only
 * /api/staff endpoint.
 */
export default function FacilityStaffList() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const sb = getStaffSupabase()
        const { data, error: err } = await sb
          .from("staff_users")
          .select("id, name, role, phone, active, created_at")
          .order("name")
        if (err) throw err
        setStaff((data ?? []) as StaffMember[])
      } catch (err) {
        setError(errorMessage(err, "Failed to load staff"))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader title="Staff" description="Everyone with access to this society's portals — view only." />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <Card>
          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Phone</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                </tr>
              </Thead>
              <Tbody>
                {staff.map((s) => (
                  <Tr key={s.id} className={!s.active ? "opacity-50" : undefined}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td>
                      <span title={roleLabel[s.role]}>
                        <Stamp tone={s.role === "admin" ? "stamp" : "ink"}>{s.role}</Stamp>
                      </span>
                    </Td>
                    <Td className="text-ink-500">{s.phone ?? "—"}</Td>
                    <Td>
                      <Stamp tone={s.active ? "stamp" : "rust"}>{s.active ? "Active" : "Inactive"}</Stamp>
                    </Td>
                    <Td className="text-ink-500">{formatDate(s.created_at)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
