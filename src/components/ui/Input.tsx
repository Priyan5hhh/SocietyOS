import { type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, forwardRef, useState } from "react"
import { ChevronDown, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

const fieldClass =
  "w-full rounded-lg border border-ink-100 bg-paper-0 px-3.5 text-ink-900 placeholder:text-ink-300 outline-none transition-shadow focus:border-ink-500 focus:ring-2 focus:ring-ink-100"

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(fieldClass, "h-11 text-sm", className)} {...props} />
  ),
)
Input.displayName = "Input"

export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn(fieldClass, "h-11 pr-10 text-sm", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = "PasswordInput"

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, "py-2.5 text-sm min-h-24 resize-y", className)} {...props} />
  ),
)
Textarea.displayName = "Textarea"

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <select ref={ref} className={cn(fieldClass, "h-11 w-full appearance-none pr-9 text-sm")} {...props}>
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
      />
    </div>
  ),
)
Select.displayName = "Select"

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-ink-700", className)} {...props} />
}
