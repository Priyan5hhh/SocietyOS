import logoMark from "@/assets/logo-mark.png"
import { cn } from "@/lib/utils"

/** The SocietyOS mark — cropped from the full wordmark logo, used wherever a square badge fits. */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <img
      src={logoMark}
      alt="SocietyOS"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-md object-cover", className)}
    />
  )
}
