import { type ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

const variants = {
  primary: "bg-chrome-900 text-white hover:bg-chrome-800 active:bg-chrome-950",
  secondary: "bg-paper-0 text-ink-900 border border-ink-100 hover:bg-paper-100",
  stamp: "bg-stamp-600 text-white hover:bg-stamp-700",
  ghost: "text-ink-700 hover:bg-ink-100/60",
  danger: "bg-rust-600 text-white hover:bg-rust-700",
}

const sizes = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-13 px-6 text-base gap-2 min-h-[52px]",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
