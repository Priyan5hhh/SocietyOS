import { api } from "@/lib/services/api"

export type ReminderTargetType = "due" | "ticket"
export type ReminderKind = "payment_reminder" | "send_bill" | "nudge_resident" | "nudge_staff"

export interface Reminder {
  id: string
  target_type: ReminderTargetType
  target_id: string
  kind: ReminderKind
  channel: "whatsapp"
  status: "queued" | "sent" | "failed"
  created_at: string
}

export function queueReminder(target_type: ReminderTargetType, target_id: string, kind: ReminderKind) {
  return api.post<{ reminder: Reminder }>("/api/reminders", { target_type, target_id, kind })
}

export function queueBulkReminders(target_type: ReminderTargetType, target_ids: string[], kind: ReminderKind) {
  return api.post<{ reminders: Reminder[]; count: number }>("/api/reminders/bulk", { target_type, target_ids, kind })
}

export function listReminders(target_type: ReminderTargetType) {
  return api.get<{ reminders: Reminder[] }>(`/api/reminders?target_type=${target_type}`)
}

/** Latest reminder timestamp per target_id, for "reminded Xh ago" labels. */
export function latestByTarget(reminders: Reminder[]): Map<string, Reminder> {
  const map = new Map<string, Reminder>()
  for (const r of reminders) {
    const existing = map.get(r.target_id)
    if (!existing || r.created_at > existing.created_at) map.set(r.target_id, r)
  }
  return map
}
