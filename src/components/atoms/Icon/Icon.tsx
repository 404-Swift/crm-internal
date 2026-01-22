import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconProps {
  icon: LucideIcon
  className?: string
  size?: number
}

export function Icon({ icon: IconComponent, className, size = 20 }: IconProps) {
  return (
    <IconComponent
      className={cn("shrink-0", className)}
      size={size}
      aria-hidden="true"
    />
  )
}
