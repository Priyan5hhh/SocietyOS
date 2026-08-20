import { useEffect, useMemo, useState } from "react"
import { AlertCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card } from "@/components/ui/Card"
import { Stamp, type StampTone } from "@/components/ui/Stamp"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { Select } from "@/components/ui/Input"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { EmptyState } from "@/components/ui/EmptyState"
import { errorMessage, formatTime } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"

interface StaffMember {
  id: string
  name: string
  role: "guard" | "worker"
}

type AttendanceStatus = "present" | "absent" | "half_day" | "leave"

interface AttendanceRow {
  id: string
  staff_id: string
  shift_date: string
  status: AttendanceStatus
  check_in_at: string | null
  check_out_at: string | null
}

const statusTone: Record<AttendanceStatus, StampTone> = {
  present: "stamp",
  absent: "rust",
  half_day: "amber",
  leave: "ink",
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function shiftDate(iso: string, deltaDays: number) {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + deltaDays)
  return d.toISOString().slice(0, 10)
}

/**
 * Facility-manager attendance marking — one day at a time (date nav
 * left/right), scoped to worker/guard staff per the research doc's
 * "shift scheduling/attendance" gap. Upserts into staff_attendance,
 * mirroring the check-in/out + status pattern from the phase 2 spec.
 */
export default function Attendance() {
  const [date, setDate] = useState(todayISO())
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [rows, setRows] = useState<Map<string, AttendanceRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const [staffRes, attendanceRes] = await Promise.all([
        sb.from("staff_users").select("id, name, role").in("role", ["guard", "worker"]).eq("active", true).order("name"),
        sb.from("staff_attendance").select("*").eq("shift_date", date),
      ])
      if (staffRes.error) throw staffRes.error
      if (attendanceRes.error) throw attendanceRes.error
      setStaff((staffRes.data ?? []) as StaffMember[])
      const map = new Map<string, AttendanceRow>()
      for (const r of (attendanceRes.data ?? []) as AttendanceRow[]) map.set(r.staff_id, r)
      setRows(map)
    } catch (err) {
      setError(errorMessage(err, "Failed to load attendance"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const summary = useMemo(() => {
    let present = 0
    let absent = 0
    for (const r of rows.values()) {
      if (r.status === "present" || r.status === "half_day") present++
      if (r.status === "absent") absent++
    }
    return { present, absent, unmarked: staff.length - rows.size }
  }, [rows, staff])

  async function setStatus(staffId: string, status: AttendanceStatus) {
    setSaving(staffId)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const existing = rows.get(staffId)
      const { staffId: sessionStaffId, societyId: sessionSociety } = getStaffClaims()
      const payload = {
        society_id: sessionSociety,
        staff_id: staffId,
        shift_date: date,
        status,
        marked_by_staff_id: sessionStaffId,
        check_in_at: status === "present" || status === "half_day" ? (existing?.check_in_at ?? new Date().toISOString()) : existing?.check_in_at ?? null,
      }
      const { data, error: upErr } = await sb
        .from("staff_attendance")
        .upsert(payload, { onConflict: "staff_id,shift_date" })
        .select()
        .single()
      if (upErr) throw upErr
      setRows((prev) => new Map(prev).set(staffId, data as AttendanceRow))
    } catch (err) {
      setError(errorMessage(err, "Failed to mark attendance"))
    } finally {
      setSaving(null)
    }
  }

  async function markCheckOut(staffId: string) {
    setSaving(staffId)
    try {
      const sb = getStaffSupabase()
      const { data, error: upErr } = await sb
        .from("staff_attendance")
        .update({ check_out_at: new Date().toISOString() })
        .eq("staff_id", staffId)
        .eq("shift_date", date)
        .select()
        .single()
      if (upErr) throw upErr
      setRows((prev) => new Map(prev).set(staffId, data as AttendanceRow))
    } catch (err) {
      setError(errorMessage(err, "Failed to mark check-out"))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance for guards and workers."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, -1))}
              className="rounded-md p-2 text-ink-500 hover:bg-paper-100"
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setDate((d) => shiftDate(d, 1))}
              disabled={date >= todayISO()}
              className="rounded-md p-2 text-ink-500 hover:bg-paper-100 disabled:opacity-30"
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!loading && staff.length > 0 && (
          <div className="mb-4 flex gap-4 text-sm text-ink-500">
            <span>
              <strong className="text-ink-900">{summary.present}</strong> present
            </span>
            <span>
              <strong className="text-ink-900">{summary.absent}</strong> absent
            </span>
            <span>
              <strong className="text-ink-900">{summary.unmarked}</strong> unmarked
            </span>
          </div>
        )}

        <Card>
          {loading ? (
            <TableSkeleton rows={4} cols={5} />
          ) : staff.length === 0 ? (
            <EmptyState title="No guards or workers yet" description="Add staff with the guard or worker role in Admin → Staff." />
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Check-in</Th>
                  <Th>Check-out</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {staff.map((s) => {
                  const row = rows.get(s.id)
                  return (
                    <Tr key={s.id}>
                      <Td className="font-medium">{s.name}</Td>
                      <Td className="capitalize text-ink-500">{s.role}</Td>
                      <Td className="text-ink-500">
                        {row?.check_in_at ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatTime(row.check_in_at)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="text-ink-500">
                        {row?.check_out_at ? (
                          formatTime(row.check_out_at)
                        ) : row?.check_in_at ? (
                          <button
                            type="button"
                            onClick={() => markCheckOut(s.id)}
                            disabled={saving === s.id}
                            className="text-xs font-medium text-ink-700 hover:underline"
                          >
                            Mark check-out
                          </button>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          {row && <Stamp tone={statusTone[row.status]}>{row.status.replace("_", " ")}</Stamp>}
                          <Select
                            className="w-36"
                            value={row?.status ?? ""}
                            disabled={saving === s.id}
                            onChange={(e) => setStatus(s.id, e.target.value as AttendanceStatus)}
                          >
                            <option value="" disabled>
                              Mark…
                            </option>
                            <option value="present">Present</option>
                            <option value="half_day">Half day</option>
                            <option value="absent">Absent</option>
                            <option value="leave">Leave</option>
                          </Select>
                        </div>
                      </Td>
                    </Tr>
                  )
                })}
              </Tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  )
}
