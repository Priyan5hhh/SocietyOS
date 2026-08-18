export type TicketStatus = "new" | "in_progress" | "resolved"
export type TicketPriority = "low" | "medium" | "high"
export type TicketCategory = "plumbing" | "electrical" | "security" | "housekeeping" | "noise" | "other"

export interface Ticket {
  id: string
  unit: string
  residentName: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  originalMessage: string
  createdAt: string
}

export type PaymentStatus = "paid" | "due" | "overdue"

export interface Resident {
  id: string
  name: string
  unit: string
  phone: string
  block: string
  isOwner: boolean
  membersCount: number
  photoUrl: string | null
  joinedAt: string
}

export interface BillCycle {
  id: string
  label: string
  dueDate: string
  totalUnits: number
  paidUnits: number
  amountPerUnit: number
}

export interface Due {
  id: string
  unit: string
  residentName: string
  cycleLabel: string
  amount: number
  status: PaymentStatus
  dueDate: string
}

export interface Notice {
  id: string
  title: string
  body: string
  postedAt: string
  postedBy: string
  pinned: boolean
}

export type VisitorPurpose = "delivery" | "guest" | "cab" | "service" | "other"

export interface Visitor {
  id: string
  name: string
  phone: string
  purpose: VisitorPurpose
  unit: string | null
  photoUrl: string | null
  preApproved: boolean
  checkInAt: string
  checkOutAt: string | null
}

export const residents: Resident[] = [
  { id: "r1", name: "Anita Deshmukh", unit: "A-402", phone: "+91 98200 11223", block: "A", isOwner: true, membersCount: 4, photoUrl: null, joinedAt: "2019-06-12" },
  { id: "r2", name: "Ravi Kulkarni", unit: "B-105", phone: "+91 98330 44556", block: "B", isOwner: true, membersCount: 3, photoUrl: null, joinedAt: "2020-01-22" },
  { id: "r3", name: "Sneha Iyer", unit: "A-201", phone: "+91 90040 77889", block: "A", isOwner: false, membersCount: 2, photoUrl: null, joinedAt: "2023-03-05" },
  { id: "r4", name: "Manoj Verma", unit: "C-703", phone: "+91 99870 22110", block: "C", isOwner: true, membersCount: 5, photoUrl: null, joinedAt: "2018-11-30" },
  { id: "r5", name: "Priya Nair", unit: "B-301", phone: "+91 97650 33441", block: "B", isOwner: true, membersCount: 3, photoUrl: null, joinedAt: "2021-08-14" },
  { id: "r6", name: "Arjun Mehta", unit: "A-104", phone: "+91 96540 88992", block: "A", isOwner: false, membersCount: 1, photoUrl: null, joinedAt: "2024-02-01" },
  { id: "r7", name: "Kavita Rao", unit: "C-502", phone: "+91 95430 66770", block: "C", isOwner: true, membersCount: 4, photoUrl: null, joinedAt: "2017-05-19" },
]

export const tickets: Ticket[] = [
  {
    id: "t1", unit: "A-402", residentName: "Anita Deshmukh", category: "plumbing", priority: "high",
    status: "new", createdAt: "2026-08-15T08:12:00",
    originalMessage: "There's a leak under the kitchen sink since this morning, water is spreading onto the floor. Please send someone urgently.",
  },
  {
    id: "t2", unit: "B-105", residentName: "Ravi Kulkarni", category: "electrical", priority: "medium",
    status: "in_progress", createdAt: "2026-08-14T19:40:00",
    originalMessage: "The lift lobby light on our floor has been flickering for 2 days now.",
  },
  {
    id: "t3", unit: "C-703", residentName: "Manoj Verma", category: "noise", priority: "low",
    status: "new", createdAt: "2026-08-14T22:05:00",
    originalMessage: "Loud construction noise from the flat above us after 10pm, please check society rules on this.",
  },
  {
    id: "t4", unit: "A-201", residentName: "Sneha Iyer", category: "security", priority: "high",
    status: "new", createdAt: "2026-08-15T07:02:00",
    originalMessage: "Saw an unknown person loitering near the parking gate around 6:30am, wasn't stopped by security.",
  },
  {
    id: "t5", unit: "B-301", residentName: "Priya Nair", category: "housekeeping", priority: "low",
    status: "resolved", createdAt: "2026-08-12T10:15:00",
    originalMessage: "Garbage wasn't collected from our floor bin for 2 days.",
  },
  {
    id: "t6", unit: "C-502", residentName: "Kavita Rao", category: "other", priority: "medium",
    status: "in_progress", createdAt: "2026-08-13T16:50:00",
    originalMessage: "Can we get an extra visitor parking sticker for my daughter's car?",
  },
]

export const billCycles: BillCycle[] = [
  { id: "bc1", label: "Maintenance — Aug 2026", dueDate: "2026-08-10", totalUnits: 48, paidUnits: 31, amountPerUnit: 4200 },
  { id: "bc2", label: "Maintenance — Jul 2026", dueDate: "2026-07-10", totalUnits: 48, paidUnits: 46, amountPerUnit: 4200 },
  { id: "bc3", label: "Sinking Fund — Q3 2026", dueDate: "2026-09-01", totalUnits: 48, paidUnits: 4, amountPerUnit: 1500 },
]

export const dues: Due[] = [
  { id: "d1", unit: "A-402", residentName: "Anita Deshmukh", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "paid", dueDate: "2026-08-10" },
  { id: "d2", unit: "B-105", residentName: "Ravi Kulkarni", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "due", dueDate: "2026-08-10" },
  { id: "d3", unit: "A-201", residentName: "Sneha Iyer", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "overdue", dueDate: "2026-08-10" },
  { id: "d4", unit: "C-703", residentName: "Manoj Verma", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "paid", dueDate: "2026-08-10" },
  { id: "d5", unit: "B-301", residentName: "Priya Nair", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "overdue", dueDate: "2026-08-10" },
  { id: "d6", unit: "A-104", residentName: "Arjun Mehta", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "due", dueDate: "2026-08-10" },
  { id: "d7", unit: "C-502", residentName: "Kavita Rao", cycleLabel: "Maintenance — Aug 2026", amount: 4200, status: "paid", dueDate: "2026-08-10" },
]

export const notices: Notice[] = [
  {
    id: "n1", title: "Water supply shutdown — 17 Aug, 10am–2pm", pinned: true,
    body: "Municipal water supply will be shut for scheduled pipeline maintenance on Monday 17 Aug from 10am to 2pm. Please store water in advance.",
    postedAt: "2026-08-14T09:00:00", postedBy: "Admin Office",
  },
  {
    id: "n2", title: "Independence Day flag hoisting — 15 Aug, 8am", pinned: true,
    body: "All residents are invited to the flag hoisting ceremony at the clubhouse lawn, followed by breakfast.",
    postedAt: "2026-08-10T12:00:00", postedBy: "Admin Office",
  },
  {
    id: "n3", title: "Lift maintenance — Block B", pinned: false,
    body: "Block B lift 2 will be under maintenance on 18 Aug from 11am to 4pm. Please use lift 1 during this window.",
    postedAt: "2026-08-13T15:20:00", postedBy: "Admin Office",
  },
]

export interface PreApproval {
  id: string
  guestName: string
  guestPhone: string
  unit: string
  residentName: string
  validUntil: string
}

/** Residents pre-approve expected guests over WhatsApp; guard looks these up at the gate. */
export const preApprovals: PreApproval[] = [
  { id: "pa1", guestName: "Rekha Joshi", guestPhone: "+91 90210 55667", unit: "B-301", residentName: "Priya Nair", validUntil: "2026-08-15T23:59:00" },
  { id: "pa2", guestName: "Dr. Sameer Kale", guestPhone: "+91 98450 11902", unit: "A-402", residentName: "Anita Deshmukh", validUntil: "2026-08-16T20:00:00" },
  { id: "pa3", guestName: "Neha & family", guestPhone: "+91 99204 33218", unit: "C-703", residentName: "Manoj Verma", validUntil: "2026-08-17T23:59:00" },
]

export const visitors: Visitor[] = [
  {
    id: "v1", name: "Suresh Pawar", phone: "+91 98220 12121", purpose: "delivery", unit: "A-402",
    photoUrl: null, preApproved: false, checkInAt: "2026-08-15T09:32:00", checkOutAt: "2026-08-15T09:41:00",
  },
  {
    id: "v2", name: "Rekha Joshi", phone: "+91 90210 55667", purpose: "guest", unit: "B-301",
    photoUrl: null, preApproved: true, checkInAt: "2026-08-15T10:05:00", checkOutAt: null,
  },
  {
    id: "v3", name: "Zomato — Akash", phone: "+91 88990 34211", purpose: "delivery", unit: "C-502",
    photoUrl: null, preApproved: false, checkInAt: "2026-08-15T10:18:00", checkOutAt: "2026-08-15T10:24:00",
  },
  {
    id: "v4", name: "Uber — KA05AB1234", phone: "+91 77660 90123", purpose: "cab", unit: "A-201",
    photoUrl: null, preApproved: false, checkInAt: "2026-08-15T08:55:00", checkOutAt: "2026-08-15T09:02:00",
  },
]
