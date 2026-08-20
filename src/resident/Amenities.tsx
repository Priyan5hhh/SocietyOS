import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CalendarDays, AlertCircle, Clock, CheckCircle2, Home, Ban } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { Stamp, type StampTone } from "@/components/ui/Stamp"
import { Logo } from "@/components/ui/Logo"
import { errorMessage, formatDate, formatINR } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { supabaseAnon } from "@/lib/services/supabase"

interface Amenity {
  id: string
  name: string
  booking_type: "slot" | "full_day"
  requires_approval: boolean
  fee_amount: number
  capacity: number | null
  slot_duration_minutes: number | null
  open_time: string | null
  close_time: string | null
  advance_booking_days: number
}

interface MyBooking {
  id: string
  amenity_id: string
  amenity_name: string
  booking_date: string
  start_time: string | null
  end_time: string | null
  status: string
  fee_amount: number
  payment_status: string
}

const statusTone: Record<string, StampTone> = {
  pending_approval: "amber",
  confirmed: "stamp",
  cancelled: "rust",
  rejected: "rust",
  completed: "ink",
  no_show: "rust",
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Resident amenity booking — list amenities, pick a slot/date, book or
 * cancel. Reads/writes go through SECURITY DEFINER RPCs
 * (resident_list_amenities / resident_book_amenity / etc), same pattern as
 * Dues.tsx, because resident login is still the Phase 0 dev-mode OTP stub
 * and doesn't carry a real Supabase JWT — see src/lib/services/supabase.ts.
 */
export default function ResidentAmenities() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const societyId = session?.kind === "resident" ? session.society_id : null
  const unitId = session?.kind === "resident" ? session.unit_id : null
  const residentId = session?.kind === "resident" ? session.resident_id : null
  const isReal = !!unitId && unitId !== "dev-unit"

  const [tab, setTab] = useState<"book" | "mine">("book")
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [bookings, setBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bookingAmenity, setBookingAmenity] = useState<Amenity | null>(null)
  const [date, setDate] = useState(todayISO())
  const [startTime, setStartTime] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function load() {
    if (!isReal || !societyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [amenitiesRes, bookingsRes] = await Promise.all([
        supabaseAnon().rpc("resident_list_amenities", { p_society_id: societyId }),
        supabaseAnon().rpc("resident_list_amenity_bookings", { p_unit_id: unitId }),
      ])
      if (amenitiesRes.error) throw amenitiesRes.error
      if (bookingsRes.error) throw bookingsRes.error
      setAmenities((amenitiesRes.data ?? []) as Amenity[])
      setBookings((bookingsRes.data ?? []) as MyBooking[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load amenities"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, societyId])

  function openBook(a: Amenity) {
    setBookingAmenity(a)
    setDate(todayISO())
    setStartTime(a.open_time?.slice(0, 5) ?? "09:00")
    setFormError(null)
  }

  function endTimeFor(a: Amenity, start: string) {
    if (!a.slot_duration_minutes) return start
    const [h, m] = start.split(":").map(Number)
    const total = h * 60 + m + a.slot_duration_minutes
    const eh = Math.floor(total / 60) % 24
    const em = total % 60
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
  }

  async function submitBooking() {
    if (!bookingAmenity || !unitId || !residentId) return
    setSubmitting(true)
    setFormError(null)
    try {
      const isSlot = bookingAmenity.booking_type === "slot"
      const { error: err } = await supabaseAnon().rpc("resident_book_amenity", {
        p_amenity_id: bookingAmenity.id,
        p_resident_id: residentId,
        p_unit_id: unitId,
        p_booking_date: date,
        p_start_time: isSlot ? startTime : null,
        p_end_time: isSlot ? endTimeFor(bookingAmenity, startTime) : null,
      })
      if (err) throw err
      setBookingAmenity(null)
      await load()
      setTab("mine")
    } catch (err) {
      setFormError(errorMessage(err, "Booking failed"))
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelBooking(b: MyBooking) {
    if (!unitId) return
    setError(null)
    try {
      const { error: err } = await supabaseAnon().rpc("resident_cancel_amenity_booking", {
        p_booking_id: b.id,
        p_unit_id: unitId,
      })
      if (err) throw err
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to cancel booking"))
    }
  }

  return (
    <div className="min-h-screen bg-paper-50">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-ink-100 bg-paper-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate("/resident")}
          className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <Logo size={22} />
        <span className="font-serif text-sm font-semibold text-ink-900">Amenities</span>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6">
        {!isReal && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            We couldn't match your phone number to a resident record, so there's nothing real to book for this
            dev-mode login.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mb-4 flex gap-1 rounded-lg border border-ink-100 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("book")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "book" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => setTab("mine")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "mine" ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-50"}`}
          >
            My bookings
          </button>
        </div>

        {loading ? (
          <Card className="p-6 text-center text-sm text-ink-500">Loading…</Card>
        ) : tab === "book" ? (
          amenities.length === 0 ? (
            <Card className="p-6 text-center text-sm text-ink-500">No amenities set up yet.</Card>
          ) : (
            <div className="space-y-3">
              {amenities.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-ink-900">{a.name}</div>
                      <div className="mt-0.5 text-xs text-ink-500">
                        {a.booking_type === "slot" ? `Slot · ${a.slot_duration_minutes ?? 60} min` : "Full day"}
                        {a.open_time && a.close_time && ` · ${a.open_time.slice(0, 5)}–${a.close_time.slice(0, 5)}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-ink-900">
                        {a.fee_amount > 0 ? formatINR(a.fee_amount) : "Free"}
                      </div>
                      {a.requires_approval && <div className="text-[10px] text-amber-700">needs approval</div>}
                    </div>
                  </div>
                  <Button size="sm" className="mt-3 w-full" onClick={() => openBook(a)}>
                    <CalendarDays size={14} /> {a.requires_approval ? "Request booking" : "Book now"}
                  </Button>
                </Card>
              ))}
            </div>
          )
        ) : bookings.length === 0 ? (
          <Card className="p-6 text-center text-sm text-ink-500">No bookings yet.</Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-ink-900">{b.amenity_name}</div>
                    <div className="mt-0.5 text-xs text-ink-500">
                      {formatDate(b.booking_date)}
                      {b.start_time && ` · ${b.start_time.slice(0, 5)}–${b.end_time?.slice(0, 5) ?? ""}`}
                    </div>
                  </div>
                  <Stamp tone={statusTone[b.status] ?? "ink"}>{b.status.replace("_", " ")}</Stamp>
                </div>
                {(b.status === "pending_approval" || b.status === "confirmed") && (
                  <button
                    type="button"
                    onClick={() => cancelBooking(b)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rust-600 hover:underline"
                  >
                    <Ban size={12} /> Cancel booking
                  </button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!bookingAmenity} onClose={() => setBookingAmenity(null)} title={bookingAmenity?.name ?? "Book"}>
        {bookingAmenity && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bk-date">Date</Label>
              <Input
                id="bk-date"
                type="date"
                value={date}
                min={todayISO()}
                max={new Date(Date.now() + bookingAmenity.advance_booking_days * 86_400_000).toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            {bookingAmenity.booking_type === "slot" && (
              <div>
                <Label htmlFor="bk-time">Start time</Label>
                <Input id="bk-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <p className="mt-1 text-xs text-ink-500">
                  Ends around {endTimeFor(bookingAmenity, startTime)} ({bookingAmenity.slot_duration_minutes ?? 60} min slot)
                </p>
              </div>
            )}
            {bookingAmenity.fee_amount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-ink-100 bg-paper-50 p-3 text-sm text-ink-700">
                <Clock size={14} /> Fee: {formatINR(bookingAmenity.fee_amount)} — payment collected offline for now.
              </div>
            )}
            {formError && (
              <div className="flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                {formError}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setBookingAmenity(null)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitBooking} disabled={submitting}>
                {submitting ? (
                  "Booking…"
                ) : bookingAmenity.requires_approval ? (
                  <>
                    <CheckCircle2 size={14} /> Request
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-ink-100 bg-white py-2">
        <button type="button" onClick={() => navigate("/resident")} className="flex flex-col items-center gap-0.5 px-4 py-1 text-ink-400">
          <Home size={18} />
          <span className="text-[10px]">Home</span>
        </button>
        <button type="button" className="flex flex-col items-center gap-0.5 px-4 py-1 text-stamp-700">
          <CalendarDays size={18} />
          <span className="text-[10px] font-medium">Amenities</span>
        </button>
      </nav>
      <div className="h-14" />
    </div>
  )
}
