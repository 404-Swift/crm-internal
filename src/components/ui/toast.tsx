import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive"
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ className, title, description, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
          variant === "destructive"
            ? "border-destructive bg-destructive text-destructive-foreground"
            : "border bg-background text-foreground",
          className
        )}
        {...props}
      >
        <div className="grid gap-1">
          {title && (
            <div className="text-sm font-semibold">{title}</div>
          )}
          {description && (
            <div className="text-sm opacity-90">{description}</div>
          )}
        </div>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }
