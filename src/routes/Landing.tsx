import { LinkTransition } from "@/components/ui/NavTransition"
import type { CSSProperties, ReactNode } from "react"
import { ArrowRight, ChevronDown, Mail, MessageSquareText, Phone } from "lucide-react"
import { Stamp } from "@/components/ui/Stamp"
import { cn } from "@/lib/utils"
import { useReveal } from "@/lib/useReveal"
import { useParallax } from "@/lib/useParallax"
import { useAuth } from "@/lib/auth-context"
import { homePathFor } from "@/routes/RequireAuth"
import { Logo } from "@/components/ui/Logo"
import { PublicHelpChatWidget } from "@/components/ui/PublicHelpChatWidget"
import { ContactButton } from "@/components/ui/ContactButton"
import { ScrollToTopButton } from "@/components/ui/ScrollToTopButton"
import { MarqueeStrip } from "@/components/ui/MarqueeStrip"
import { VideoHero } from "@/components/landing/VideoHero"
import { SplitReveal } from "@/components/landing/SplitReveal"
import { WhatsAppToLedger } from "@/components/landing/WhatsAppToLedger"
import { AnimatedTimeline } from "@/components/landing/AnimatedTimeline"
import {
  steps,
  features,
  featureToneClass,
  signupSteps,
  faqs,
  trustPoints,
  CONTACT,
  MARKETING_IMAGES,
  MARKETING_VIDEOS,
} from "@/routes/landing-data"
import creatorPhoto from "@/assets/priyansh-rajput.jpg"

function Reveal({
  children,
  className,
  style,
  direction = "up",
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  direction?: "up" | "left" | "right" | "scale"
}) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={cn(direction === "up" ? "reveal" : `reveal-${direction}`, visible && "is-visible", className)} style={style}>
      {children}
    </div>
  )
}

const ctaClass =
  "inline-flex h-13 min-h-[52px] items-center justify-center gap-2 rounded-lg bg-chrome-900 px-6 text-base font-medium text-white transition-[background-color,transform] duration-150 hover:bg-chrome-800 active:scale-[0.97] active:bg-chrome-950"

// Only images that don't already appear in a dedicated section below —
// every marketing photo on the page shows up exactly once.
const photoStripImages = [
  MARKETING_IMAGES.committeeMeeting,
  MARKETING_IMAGES.courtyard,
  MARKETING_IMAGES.apartmentDaytime,
  MARKETING_IMAGES.doorNumberPlate,
  MARKETING_IMAGES.writingRegister,
  MARKETING_IMAGES.paperworkPen,
]

const communityGallery = [
  { src: MARKETING_IMAGES.childPlayingPark, caption: "Kids still just play in the courtyard." },
  { src: MARKETING_IMAGES.familyLivingRoom, caption: "Evenings at home, undisturbed by admin." },
  { src: MARKETING_IMAGES.elderlyResident, caption: "Grandparents looked after, not left behind." },
  { src: MARKETING_IMAGES.neighborsChatting, caption: "Neighbors who still know each other." },
]

export default function Landing() {
  const { session } = useAuth()
  const ctaHref = session ? homePathFor(session) : "/login"
  const ctaLabel = session ? "Go to dashboard" : "Sign in"
  const parallaxRef = useParallax<HTMLDivElement>(0.08)

  return (
    <div className="bg-paper-50">
      <header className="sticky top-0 z-40 border-b border-ink-100 bg-paper-0/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <Logo size={30} />
            <span className="font-serif text-lg font-semibold tracking-tight text-ink-900">SocietyOS</span>
          </div>
          <nav className="hidden items-center gap-8 sm:flex">
            <a href="#how-it-works" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              Features
            </a>
            <a href="#trust" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              Trust & Security
            </a>
            <a href="#faq" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              FAQ
            </a>
            <a href="#contact" className="text-sm font-medium text-ink-500 hover:text-ink-900">
              Contact
            </a>
          </nav>
          <LinkTransition to={ctaHref} className="text-sm font-medium text-ink-700 hover:underline">
            {ctaLabel}
          </LinkTransition>
        </div>
      </header>

      {/* ---------- hero: calm video ---------- */}
      <VideoHero src={MARKETING_VIDEOS.parkStroll} heightClass="h-[62vh] min-h-[460px]">
        <div className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-500">
          No app · no login · just WhatsApp
        </div>
        <SplitReveal
          as="h1"
          text="Run the society from a register, not a group chat."
          className="mt-4 max-w-2xl text-balance font-serif text-4xl font-bold leading-[1.1] tracking-tight text-paper-0 sm:text-5xl"
        />
        <p className="mt-5 max-w-lg text-base leading-relaxed text-paper-100/90 sm:text-lg">
          Residents already message your committee on WhatsApp about leaks, dues, and deliveries. SocietyOS turns
          every one of those messages into a dated entry your committee can act on.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <LinkTransition to={ctaHref} className={ctaClass}>
            {ctaLabel} <ArrowRight size={16} />
          </LinkTransition>
          <a href="#how-it-works" className="text-sm font-medium text-paper-0 hover:underline">
            See how it works
          </a>
        </div>
      </VideoHero>

      {/* ---------- photo strip: never stops ---------- */}
      <MarqueeStrip
        className="border-b border-ink-100 bg-paper-0 py-6"
        durationS={42}
        items={photoStripImages.map((src, i) => (
          <img key={i} src={src} alt="" className="h-48 w-72 rounded-xl border border-ink-100 object-cover" />
        ))}
      />

      {/* ---------- see it in action: the WhatsApp -> ledger demo ---------- */}
      <section className="border-b border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-xl text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">See it happen in real time.</h2>
            <p className="mt-4 leading-relaxed text-ink-500">
              A resident sends one WhatsApp message. SocietyOS reads it, tags the unit, sets a priority, and drops it
              straight into the register — no one on your committee has to type it in by hand.
            </p>
          </Reveal>
          <div className="mt-14">
            <WhatsAppToLedger />
          </div>
        </div>
      </section>

      {/* ---------- how it works ---------- */}
      <section id="how-it-works" className="border-b border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">How it works</h2>
            <p className="mt-2 max-w-xl text-ink-500">Three steps, and only one of them involves your committee.</p>
          </Reveal>

          <div className="mt-16">
            <AnimatedTimeline items={steps} />
          </div>
        </div>
      </section>

      {/* ---------- features: gentle fade-in, fully explained ---------- */}
      <section id="features" className="border-b border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">Everything the committee runs</h2>
            <p className="mt-2 max-w-xl text-ink-500">Five registers, one dashboard — and exactly how each one works.</p>
          </Reveal>

          <div className="mt-12 space-y-6">
            {features.map((f, i) => (
              <Reveal key={f.title} direction={i % 2 === 0 ? "left" : "right"} style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                <div className="rounded-2xl border border-ink-100 bg-paper-0 p-8 transition-all duration-200 hover:border-ink-300 hover:shadow-[0_8px_24px_rgba(16,39,63,0.08)]">
                  <div className="flex items-start gap-5">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${featureToneClass[f.tone]}`}>
                      <f.icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-semibold text-ink-900">{f.title}</h3>
                      <p className="mt-1 text-sm font-medium text-ink-500">{f.body}</p>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500">{f.detail}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- trust & security ---------- */}
      <section id="trust" className="border-b border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid grid-cols-1 items-start gap-16 lg:grid-cols-[1fr_1fr]">
            <div>
              <Reveal>
                <div className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">Trust & Security</div>
                <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink-900">
                  We take care of your society the way we'd want ours cared for.
                </h2>
                <p className="mt-3 max-w-md text-ink-500">
                  No fabricated numbers, no borrowed logos — just what's actually true about how SocietyOS handles
                  your committee's and your residents' information.
                </p>
              </Reveal>
              <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
                {trustPoints.map((t, i) => (
                  <Reveal key={t.title} direction={i % 2 === 0 ? "left" : "right"} style={{ transitionDelay: `${i * 70}ms` }}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                      <t.icon size={18} />
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-ink-900">{t.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{t.body}</p>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal direction="scale" className="overflow-hidden rounded-2xl border border-ink-100 shadow-[0_8px_24px_rgba(16,39,63,0.1)]">
              <img
                src={MARKETING_IMAGES.signingDocument}
                alt="A hand signing a formal document"
                className="h-72 w-full object-cover sm:h-[26rem]"
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- belonging: calm parallax ---------- */}
      <section className="relative h-[46vh] min-h-[360px] overflow-hidden">
        <div ref={parallaxRef} className="absolute inset-0">
          <img
            src={MARKETING_IMAGES.heroApartment}
            alt="A housing society apartment building lit up at night"
            className="h-[125%] w-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/75 via-ink-950/35 to-ink-950/10" />
        <div className="relative mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <SplitReveal
            as="h2"
            text="Every society has its own rhythm. SocietyOS keeps it."
            className="font-serif text-2xl font-bold leading-tight text-paper-0 sm:text-3xl"
          />
        </div>
      </section>

      {/* ---------- who we're building for ---------- */}
      <section className="border-b border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">This is who we're building for.</h2>
            <p className="mt-2 text-ink-500">Not just a committee's admin tool — a society's daily life, running underneath it.</p>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {communityGallery.map((g, i) => (
              <Reveal key={g.src} direction="scale" style={{ transitionDelay: `${i * 120}ms` }}>
                <div className="group overflow-hidden rounded-2xl border border-ink-100 transition-shadow duration-300 hover:shadow-[0_12px_28px_rgba(16,39,63,0.14)]">
                  <img
                    src={g.src}
                    alt={g.caption}
                    className="h-56 w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 text-sm text-ink-500">{g.caption}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- design note ---------- */}
      <section className="border-b border-ink-100 bg-paper-0">
        <Reveal direction="scale" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-ink-100 shadow-[0_8px_24px_rgba(16,39,63,0.1)] order-2 lg:order-1">
            <img
              src={MARKETING_IMAGES.ledgerDesk}
              alt="An open ledger notebook and clipboard on a desk"
              className="h-64 w-full object-cover sm:h-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-paper-0/95 p-2 shadow-sm">
              <Stamp tone="stamp">Paid</Stamp>
              <Stamp tone="amber">Due</Stamp>
              <Stamp tone="rust">Overdue</Stamp>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">
              Built like a record book, not a dashboard.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-500">
              Every entry in SocietyOS gets a status the way a ledger clerk would mark one — stamped, dated,
              unambiguous. Paid, pending, or overdue reads at a glance, in the margin, not buried in a settings
              menu.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------- residents keep it simple ---------- */}
      <section className="border-b border-ink-100 bg-paper-0">
        <Reveal direction="scale" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl border border-ink-100 shadow-[0_8px_24px_rgba(16,39,63,0.1)]">
            <img
              src={MARKETING_IMAGES.residentOnPhone}
              alt="A resident on a phone call at home"
              className="h-64 w-full object-cover sm:h-80"
            />
          </div>
          <div>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">
              Residents keep doing what they already do.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink-500">
              No account to create, no app to open when something's wrong at home. They message the same WhatsApp
              number they always have — SocietyOS is the part they never have to think about.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------- request your society ---------- */}
      {!session && (
        <section id="request-access" className="border-b border-ink-100 bg-paper-0">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <Reveal className="mx-auto max-w-2xl text-center">
              <div className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">Not registered yet?</div>
              <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-ink-900">
                Bring your society's register online.
              </h2>
              <p className="mt-3 text-ink-500">
                Every new society is reviewed by hand before it goes live — here's exactly what happens after you ask.
              </p>
            </Reveal>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              {signupSteps.map((s, i) => (
                <Reveal key={s.title} direction={i % 2 === 0 ? "left" : "right"} style={{ transitionDelay: `${i * 80}ms` }} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ink-100 text-ink-700">
                    <s.icon size={20} />
                  </div>
                  <h3 className="mt-4 font-serif text-lg font-semibold text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.body}</p>
                </Reveal>
              ))}
            </div>

            <Reveal className="mt-12 flex flex-col items-center gap-3">
              <LinkTransition to="/signup" className={ctaClass}>
                Request access for your society <ArrowRight size={16} />
              </LinkTransition>
              <p className="text-sm text-ink-500">
                Have a quick question first? Ask the chat in the corner, or{" "}
                <a href={`mailto:${CONTACT.email}`} className="font-medium text-ink-700 hover:underline">
                  email the team
                </a>
                .
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <Reveal className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">Questions, answered</h2>
          <p className="mt-2 text-ink-500">Everything people usually ask before signing up.</p>
        </Reveal>

        <Reveal className="mt-10 divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-paper-0">
          {faqs.map((f) => (
            <details key={f.q} className="group px-6 py-4 open:pb-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-ink-900 marker:content-none">
                {f.q}
                <ChevronDown size={16} className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ---------- contact ---------- */}
      <section id="contact" className="border-t border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">Talk to a person, not a form.</h2>
            <p className="mt-2 text-ink-500">Every message reaches the team directly. We reply within 24 hours.</p>
          </Reveal>

          <Reveal className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href={`mailto:${CONTACT.email}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-paper-0 p-6 text-center transition-colors hover:border-ink-300 hover:bg-paper-50"
            >
              <Mail size={22} className="text-ink-700" />
              <span className="text-sm font-semibold text-ink-900">Email</span>
              <span className="text-xs text-ink-500">{CONTACT.email}</span>
            </a>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-paper-0 p-6 text-center text-ink-300">
              <MessageSquareText size={22} />
              <span className="text-sm font-semibold">WhatsApp</span>
              <span className="text-xs">Coming soon</span>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-paper-0 p-6 text-center text-ink-300">
              <Phone size={22} />
              <span className="text-sm font-semibold">Call</span>
              <span className="text-xs">Coming soon</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- closing CTA ---------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <Reveal>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-ink-900">
            {session ? "Pick up right where you left off." : "Ready when you are."}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-500">
            {session
              ? "Head back into your dashboard."
              : "Sign in as an admin to set up billing and notices, or as a guard to start logging visitors at the gate."}
          </p>
          <div className="mt-8">
            <LinkTransition to={ctaHref} className={ctaClass}>
              {ctaLabel} <ArrowRight size={16} />
            </LinkTransition>
          </div>
        </Reveal>
      </section>

      {/* ---------- credits ---------- */}
      <section id="built-by" className="border-t border-ink-100 bg-paper-0">
        <Reveal className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-stamp-600">Built by</h2>
          <div className="mt-6 flex flex-col items-center">
            <img
              src={creatorPhoto}
              alt="Priyansh Rajput"
              className="h-28 w-28 rounded-full border-2 border-ink-100 object-cover shadow-[0_4px_12px_rgba(16,39,63,0.12)]"
              style={{ objectPosition: "50% 14%" }}
            />
            <div className="mt-4 font-serif text-lg font-semibold text-ink-900">Priyansh Rajput</div>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-500">
              Designed and built SocietyOS end to end — the WhatsApp-to-ticket pipeline, the ledger-styled UI, and
              everything wiring them together. It started from watching how much of a housing society's real work
              was already happening in a WhatsApp group — the leaks, the dues, the notices — with no record of any
              of it a week later. SocietyOS is the register that group chat was always missing.
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-ink-100 bg-paper-0">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <Logo size={26} />
                <span className="font-serif text-sm font-semibold text-ink-900">SocietyOS</span>
              </div>
              <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-ink-500">
                A registry for housing societies, run entirely from WhatsApp on the resident side.
              </p>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-300">Product</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-500">
                <li>
                  <a href="#features" className="hover:text-ink-900">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#trust" className="hover:text-ink-900">
                    Trust & Security
                  </a>
                </li>
                <li>
                  <LinkTransition to="/login" className="hover:text-ink-900">
                    Sign in
                  </LinkTransition>
                </li>
                <li>
                  <LinkTransition to="/resident/login" className="hover:text-ink-900">
                    Resident sign in
                  </LinkTransition>
                </li>
                <li>
                  <LinkTransition to="/signup" className="hover:text-ink-900">
                    Sign up your society
                  </LinkTransition>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-300">Company</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-500">
                <li>
                  <a href="#built-by" className="hover:text-ink-900">
                    About
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-ink-900">
                    Contact
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT.email}`} className="hover:text-ink-900">
                    {CONTACT.email}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-300">Legal</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-500">
                <li>
                  <span className="cursor-default text-ink-300" title="Coming soon">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="cursor-default text-ink-300" title="Coming soon">
                    Terms of Service
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6 font-mono text-xs text-ink-300">
            <span>© {new Date().getFullYear()} SocietyOS — registry system for housing societies</span>
            <span>No app · no login · just WhatsApp</span>
          </div>
        </div>
      </footer>

      <PublicHelpChatWidget />
      <ContactButton />
      <ScrollToTopButton />
    </div>
  )
}
