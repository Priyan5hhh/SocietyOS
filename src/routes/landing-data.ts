import {
  Receipt,
  Ticket,
  Megaphone,
  Users,
  ShieldCheck,
  ClipboardCheck,
  UserCheck,
  Rocket,
  Lock,
  Eye,
  Clock,
  Ban,
  MessageCircle,
  BookMarked,
  LayoutDashboard,
} from "lucide-react"

export const steps = [
  {
    n: "01",
    icon: MessageCircle,
    title: "A resident sends a WhatsApp message",
    body: "No app to install, no password to remember. “Leak under the kitchen sink” goes straight to the number your society already uses.",
  },
  {
    n: "02",
    icon: BookMarked,
    title: "SocietyOS logs it in the register",
    body: "The message becomes a ticket, a due, or a notice — tagged with the unit, timestamped, and given a status the moment it arrives.",
  },
  {
    n: "03",
    icon: LayoutDashboard,
    title: "The committee works from one ledger",
    body: "Whoever's on duty opens the dashboard, sees what's pending, and clears it. Nothing sits buried three hundred messages deep in a group chat.",
  },
]

export const features = [
  {
    icon: Users,
    tone: "ink" as const,
    title: "Resident Registry",
    body: "Every unit, owner or tenant, on one page — searchable by name or unit, editable in place.",
    detail:
      "Add residents one at a time, or describe your blocks and flat ranges in plain English and let SocietyOS set up every unit at once. Moved out? Changed hands? Update it in place — the history stays attached to the unit, not lost in a spreadsheet.",
  },
  {
    icon: Receipt,
    tone: "amber" as const,
    title: "Billing & Dues",
    body: "Open a cycle, watch collection climb unit by unit, and see who's paid, due, or overdue at a glance.",
    detail:
      "Open a billing cycle, and every unit gets a due amount with a status — paid, due, or overdue — that updates the moment a payment lands. A gentle reminder goes out over WhatsApp to anyone still pending, so the committee isn't the one chasing every flat by hand.",
  },
  {
    icon: Ticket,
    tone: "rust" as const,
    title: "Ticket Queue",
    body: "Complaints arrive pre-sorted by priority, straight from the resident's own words — nothing paraphrased or lost.",
    detail:
      "A leak, a broken lift, a noise complaint — whatever comes in over WhatsApp becomes a ticket automatically, tagged with the unit and given a priority. Whoever's on duty works the queue top to bottom instead of scrolling back through a group chat trying to remember what was already handled.",
  },
  {
    icon: Megaphone,
    tone: "stamp" as const,
    title: "Notices",
    body: "Post once, and it reaches every resident's WhatsApp — pin the ones that matter to the top.",
    detail:
      "Water shutdown, a society meeting, a festival announcement — post it once and it reaches every resident's WhatsApp the same way a message from the committee always has. Pin the ones that matter so they don't get buried under the next hundred messages.",
  },
  {
    icon: ShieldCheck,
    tone: "ink" as const,
    title: "Gate & Visitor Log",
    body: "Guards log a visitor with a photo in two taps, and check pre-approvals residents sent ahead over WhatsApp.",
    detail:
      "At the gate, a guard logs a visitor's name, phone and photo in two taps — no paper register to lose or misplace. If a resident has already messaged ahead about a guest or delivery, the guard sees the pre-approval instantly instead of calling up to confirm.",
  },
]

export const featureToneClass = {
  ink: "bg-ink-100 text-ink-700",
  stamp: "bg-stamp-100 text-stamp-700",
  amber: "bg-amber-100 text-amber-700",
  rust: "bg-rust-100 text-rust-700",
}

export const signupSteps = [
  {
    icon: ClipboardCheck,
    title: "Tell us about your society",
    body: "Society name, your name, and an email — takes under a minute, no payment details up front.",
  },
  {
    icon: UserCheck,
    title: "A platform admin reviews it",
    body: "Every new society is checked by hand before it goes live, not auto-approved — you'll be notified either way.",
  },
  {
    icon: Rocket,
    title: "Sign in and set up",
    body: "Once approved, sign in and start adding residents, opening a billing cycle, and inviting your guard staff.",
  },
]

export const faqs = [
  {
    q: "Do residents need to install an app?",
    a: "No. Residents keep using WhatsApp exactly as they do today — the same number the committee already messages. SocietyOS runs behind that number; nothing new to download or log into on their side.",
  },
  {
    q: "What does SocietyOS cost?",
    a: "We don't publish a fixed price yet — cost depends on your society's size and needs. Send a request through the form below or ask the chat in the corner, and the team will get back to you directly.",
  },
  {
    q: "How long does approval take after I sign up?",
    a: "A platform admin reviews every new society by hand, so it isn't instant — but requests are typically reviewed within a day or two. You'll be notified as soon as yours is approved.",
  },
  {
    q: "Is our society's data private to us?",
    a: "Yes. Every resident, ticket, bill, and notice is scoped to your society alone — there's no cross-society visibility, and only the staff accounts you create can sign in to your register.",
  },
  {
    q: "Can more than one person manage the society?",
    a: "Yes. Admins can create additional staff accounts — more admins to run billing and notices, or guard accounts for the gate — each with their own login and role-scoped access.",
  },
  {
    q: "What happens to a complaint after a resident messages it in?",
    a: "It's logged as a ticket immediately, tagged with the unit and a priority. Whoever's on duty sees it in the Ticket Queue and works it from there — nothing stays buried in a chat thread.",
  },
  {
    q: "We already keep records in Excel and WhatsApp — can we move them over?",
    a: "Yes. The Resident Registry has a bulk-import tool built for exactly this — upload your existing sheet, review how the columns map, and the whole register is set up in one pass instead of retyping every unit by hand.",
  },
  {
    q: "What if we want to stop using SocietyOS later?",
    a: "There's no lock-in. Your data belongs to your society, not to us — if you decide to leave, you can export your records and close the account. We'd rather earn a renewal than trap one.",
  },
  {
    q: "Can one SocietyOS account run more than one society, or is it one register per society?",
    a: "One register per society today, each with its own admins and guards. If you manage multiple societies, each gets set up and reviewed separately so their records never mix.",
  },
  {
    q: "Do you sell or share resident data with anyone?",
    a: "No. There's no advertising business here and nothing to sell — resident data exists only to run your society's register, visible only to the staff accounts you create.",
  },
  {
    q: "Is SocietyOS independently security-certified (SOC 2, ISO 27001, etc.)?",
    a: "Not yet — we're an early-stage product and haven't pursued formal certification. What we can tell you plainly: every society's data is isolated at the database level, every new society is reviewed by a person before it goes live, and access is scoped strictly to the staff accounts you create.",
  },
  {
    q: "How do I actually reach a person if something goes wrong?",
    a: "Email or the chat widget in the corner of this page — both reach the team directly, not a ticket queue. We aim to reply within 24 hours.",
  },
  {
    q: "Does the AI ever make up numbers when residents or admins ask questions?",
    a: "No. Status questions like \"how many people haven't paid\" are answered directly from your live billing data, not generated by AI — so the number is always real, never guessed.",
  },
]

export const trustPoints = [
  {
    icon: Lock,
    title: "Your society's data stays yours",
    body: "Every resident, bill, ticket and notice is isolated to your society alone — there's no cross-society visibility, and it's never used for anything but running your register.",
  },
  {
    icon: Eye,
    title: "A person reviews every signup",
    body: "New societies aren't auto-approved. A platform admin checks each request by hand before it goes live — the same care as reviewing a new member for the committee itself.",
  },
  {
    icon: Ban,
    title: "No ads, no data-selling",
    body: "There's no advertising business behind this. Resident information exists to help your committee run the society, full stop — not to be sold or shared onward.",
  },
  {
    icon: Clock,
    title: "We reply within 24 hours",
    body: "A real person reads every message that comes in through the chat widget or email — not a ticket queue that goes quiet. You'll hear back within a day.",
  },
]

export const CONTACT = {
  email: "contact@societyos.app",
}

export const MARKETING_IMAGES = {
  writingRegister: "https://ik.imagekit.io/3mwduebz8/marketing/writing-register.jpg",
  ledgerDesk: "https://ik.imagekit.io/3mwduebz8/marketing/ledger-desk.jpg",
  heroApartment: "https://ik.imagekit.io/3mwduebz8/marketing/hero-apartment-night.jpg",
  committeeMeeting: "https://ik.imagekit.io/3mwduebz8/marketing/committee-meeting.jpg",
  residentOnPhone: "https://ik.imagekit.io/3mwduebz8/marketing/resident-on-phone.jpg",
  apartmentDaytime: "https://ik.imagekit.io/3mwduebz8/marketing/apartment-daytime.jpg",
  phoneCloseup: "https://ik.imagekit.io/3mwduebz8/marketing/phone-closeup.jpg",
  courtyard: "https://ik.imagekit.io/3mwduebz8/marketing/courtyard.jpg",
  paperworkPen: "https://ik.imagekit.io/3mwduebz8/marketing/paperwork-pen.jpg",
  doorNumberPlate: "https://ik.imagekit.io/3mwduebz8/marketing/door-number-plate.jpg",
  childPlayingPark: "https://ik.imagekit.io/3mwduebz8/marketing/child-playing-park.jpg",
  familyLivingRoom: "https://ik.imagekit.io/3mwduebz8/marketing/family-living-room.jpg",
  elderlyResident: "https://ik.imagekit.io/3mwduebz8/marketing/elderly-resident.jpg",
  neighborsChatting: "https://ik.imagekit.io/3mwduebz8/marketing/neighbors-chatting.jpg",
  signingDocument: "https://ik.imagekit.io/3mwduebz8/marketing/signing-document.jpg",
}

export const MARKETING_VIDEOS = {
  aerialApartments: "https://cdn.pixabay.com/video/2021/01/05/61193-497862950_large.mp4",
  aerialNeighborhood: "https://cdn.pixabay.com/video/2016/06/27/3584-172488232_large.mp4",
  rainOnWindow: "https://cdn.pixabay.com/video/2021/05/18/74387-552236084_large.mp4",
  parkStroll: "https://cdn.pixabay.com/video/2017/02/01/7621-202267666_large.mp4",
}
