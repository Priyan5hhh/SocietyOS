import { useEffect, useMemo, useState } from "react"
import { AlertCircle, Calendar, BellRing, Receipt, RefreshCw, CreditCard, Clock } from "lucide-react"
import { PageHeader } from "@/admin/components/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Stamp } from "@/components/ui/Stamp"
import { Modal } from "@/components/ui/Modal"
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/Table"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { formatDate, formatINR } from "@/lib/utils"
import { getStaffSupabase, getStaffClaims } from "@/lib/services/supabase"
import { errorMessage } from "@/lib/utils"

type SubscriptionStatus = "trialing" | "active" | "past_due" | "grace_period" | "suspended" | "cancelled"

interface Plan {
  id: string
  name: string
  price_paise: number
  billing_cycle: "monthly" | "annual"
  unit_limit: number | null
  features: string[]
}

interface SubscriptionData {
  id: string
  plan_id: string
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string
  trial_ends_at: string | null
  grace_period_ends_at: string | null
  reminder_days_before: number
  payment_method_label: string | null
  plans: Plan
}

interface Invoice {
  id: string
  amount_paise: number
  status: "open" | "paid" | "overdue" | "void"
  period_start: string
  period_end: string
  issued_at: string
  paid_at: string | null
}

const statusTone: Record<SubscriptionStatus, "stamp" | "amber" | "rust" | "ink"> = {
  trialing: "amber",
  active: "stamp",
  past_due: "rust",
  grace_period: "amber",
  suspended: "rust",
  cancelled: "ink",
}

const statusCopy: Record<SubscriptionStatus, string> = {
  trialing: "Trial",
  active: "Active",
  past_due: "Payment overdue",
  grace_period: "Grace period",
  suspended: "Suspended",
  cancelled: "Cancelled",
}

const invoiceStatusTone = { paid: "stamp", open: "amber", overdue: "rust", void: "ink" } as const

/**
 * Subscription — what this society pays SocietyOS. Reads/writes go straight
 * to Supabase (subscriptions/plans/invoices already exist and have RLS for
 * admin/finance), same pattern as Phase 1/2's Billing screens, because the
 * `/api/subscription` route this used to call lives on societyos-api which
 * is out of reach. "Change plan" is a real write (subscriptions.plan_id).
 * "Update payment method" is stubbed — see docs/pipeline/NEEDS_YOUR_INPUT.md.
 */
export default function Subscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [changingPlan, setChangingPlan] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const sb = getStaffSupabase()
      const { societyId } = getStaffClaims()
      const { data: subData, error: subErr } = await sb
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("society_id", societyId ?? "")
        .maybeSingle()
      if (subErr) throw subErr
      setSubscription(subData as unknown as SubscriptionData | null)

      const { data: invData, error: invErr } = await sb
        .from("invoices")
        .select("*")
        .eq("society_id", societyId ?? "")
        .order("issued_at", { ascending: false })
      if (invErr) throw invErr
      setInvoices((invData ?? []) as Invoice[])

      const { data: planData, error: planErr } = await sb.from("plans").select("*").order("price_paise")
      if (planErr) throw planErr
      setPlans((planData ?? []) as Plan[])
    } catch (err) {
      setError(errorMessage(err, "Failed to load subscription"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const daysUntilRenewal = useMemo(() => {
    if (!subscription) return null
    return Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / 86_400_000)
  }, [subscription])

  const reminderDate = useMemo(() => {
    if (!subscription) return null
    const d = new Date(subscription.current_period_end)
    d.setDate(d.getDate() - subscription.reminder_days_before)
    return d
  }, [subscription])

  function openPlanModal() {
    setSelectedPlan(subscription?.plan_id ?? null)
    setPlanModalOpen(true)
  }

  async function changePlan() {
    if (!subscription || !selectedPlan || selectedPlan === subscription.plan_id) {
      setPlanModalOpen(false)
      return
    }
    setChangingPlan(true)
    try {
      const sb = getStaffSupabase()
      const { error: updErr } = await sb.from("subscriptions").update({ plan_id: selectedPlan }).eq("id", subscription.id)
      if (updErr) throw updErr
      setPlanModalOpen(false)
      await load()
    } catch (err) {
      setError(errorMessage(err, "Failed to change plan"))
    } finally {
      setChangingPlan(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="What this society pays SocietyOS — plan, renewal, and billing history."
        action={
          subscription && (
            <Button variant="secondary" onClick={openPlanModal}>
              <RefreshCw size={16} /> Change plan
            </Button>
          )
        }
      />
      <div className="p-8">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border-2 border-rust-500 bg-rust-100 p-3 text-sm text-rust-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Card>
            <TableSkeleton rows={4} cols={1} />
          </Card>
        ) : !subscription ? (
          <Card className="p-6 text-center text-sm text-ink-500">No subscription on file — contact SocietyOS support.</Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Current plan</div>
                <div className="mt-2 text-xl font-semibold text-ink-900">{subscription.plans.name}</div>
                <div className="mt-1 text-sm text-ink-500">
                  {formatINR(subscription.plans.price_paise / 100)} / {subscription.plans.billing_cycle === "monthly" ? "month" : "year"}
                </div>
                <div className="mt-3">
                  <Stamp tone={statusTone[subscription.status]}>{statusCopy[subscription.status]}</Stamp>
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Renews / expires</div>
                <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink-900">
                  <Calendar size={18} className="text-ink-400" />
                  {formatDate(subscription.current_period_end)}
                </div>
                <div className="mt-1 text-sm text-ink-500">
                  {daysUntilRenewal !== null &&
                    (daysUntilRenewal >= 0 ? `${daysUntilRenewal} days from now` : `${Math.abs(daysUntilRenewal)} days overdue`)}
                </div>
              </Card>

              <Card className="p-5">
                <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Renewal reminder</div>
                <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink-900">
                  <BellRing size={18} className="text-ink-400" />
                  {reminderDate ? formatDate(reminderDate.toISOString()) : "—"}
                </div>
                <div className="mt-1 text-sm text-ink-500">{subscription.reminder_days_before} days before renewal</div>
              </Card>
            </div>

            {subscription.plans.features?.length > 0 && (
              <Card className="mt-4 p-5">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">Included in {subscription.plans.name}</div>
                <ul className="grid grid-cols-1 gap-1.5 text-sm text-ink-700 sm:grid-cols-2">
                  {subscription.plans.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-stamp-500" /> {f}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <Card className="mt-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-ink-500">Payment method</div>
                  <div className="mt-1 text-sm text-ink-700">{subscription.payment_method_label ?? "Not set"}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setPaymentModalOpen(true)}>
                  <CreditCard size={14} /> Update payment method
                </Button>
              </div>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={16} /> Invoice history
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {invoices.length === 0 ? (
                  <p className="py-4 text-sm text-ink-500">No invoices yet.</p>
                ) : (
                  <Table>
                    <Thead>
                      <tr>
                        <Th>Period</Th>
                        <Th>Amount</Th>
                        <Th>Status</Th>
                        <Th>Issued</Th>
                        <Th>Paid</Th>
                      </tr>
                    </Thead>
                    <Tbody>
                      {invoices.map((inv) => (
                        <Tr key={inv.id}>
                          <Td className="text-ink-500">
                            {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                          </Td>
                          <Td className="font-medium">{formatINR(inv.amount_paise / 100)}</Td>
                          <Td>
                            <Stamp tone={invoiceStatusTone[inv.status]}>{inv.status}</Stamp>
                          </Td>
                          <Td className="text-ink-500">{formatDate(inv.issued_at)}</Td>
                          <Td className="text-ink-500">{inv.paid_at ? formatDate(inv.paid_at) : "—"}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Modal open={planModalOpen} onClose={() => setPlanModalOpen(false)} title="Change plan">
        <div className="space-y-3">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlan(p.id)}
              className={`flex w-full items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${
                selectedPlan === p.id ? "border-ink-900 bg-paper-50" : "border-ink-100 hover:bg-paper-50"
              }`}
            >
              <div>
                <div className="text-sm font-semibold text-ink-900">{p.name}</div>
                <div className="text-xs text-ink-500">
                  {formatINR(p.price_paise / 100)} / {p.billing_cycle === "monthly" ? "month" : "year"}
                  {p.unit_limit ? ` · up to ${p.unit_limit} units` : " · unlimited units"}
                </div>
              </div>
              {selectedPlan === p.id && <span className="text-xs font-medium text-stamp-700">Selected</span>}
            </button>
          ))}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPlanModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={changePlan} disabled={changingPlan}>
              {changingPlan ? "Saving…" : "Confirm change"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title="Update payment method">
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border-2 border-amber-500 bg-amber-100 p-3 text-sm text-amber-800">
            <Clock size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold uppercase tracking-wide text-xs">Launching soon</p>
              <p className="mt-1">
                Self-serve payment method updates need a live Razorpay/Stripe customer-vault integration, which this
                society doesn't have yet (same gateway dependency as resident Pay Now). Contact SocietyOS support to
                update your payment method for now.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setPaymentModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
