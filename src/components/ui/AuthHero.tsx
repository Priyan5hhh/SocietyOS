import { CheckCircle2 } from "lucide-react"

/**
 * Shared visual for the auth screens (Login, Signup) — a tinted photo with a
 * short, page-specific set of reassurance points. Kept data-driven so each
 * page supplies its own image/copy instead of duplicating the markup.
 */
export function AuthHero({
  imageSrc,
  imageAlt,
  points,
  tagline,
}: {
  imageSrc: string
  imageAlt: string
  points: string[]
  tagline: string
}) {
  return (
    <div className="relative h-full w-full">
      <img src={imageSrc} alt={imageAlt} className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-chrome-900/80 mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-t from-chrome-950/90 via-chrome-900/20 to-transparent" />

      <div className="absolute inset-x-0 top-10 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stamp-500/90 shadow-lg">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 22V12h6v10" />
            <path d="M3 10l9-7 9 7" />
            <path d="M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10" />
          </svg>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-10 pb-10">
        <ul className="mb-6 space-y-2.5">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-white/90">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-stamp-400" />
              {point}
            </li>
          ))}
        </ul>
        <span className="font-mono text-xs tracking-[0.2em] text-white/80">{tagline}</span>
      </div>
    </div>
  )
}
