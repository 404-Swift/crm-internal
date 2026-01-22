import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  options: FilterOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function FilterDropdown({
  options,
  value,
  onChange,
  placeholder = "Filter",
  className,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        <span>{selectedOption?.label || placeholder}</span>
        <Icon icon={ChevronDown} className="ml-2" size={16} />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full z-20 mt-1 w-full rounded-md border bg-popover shadow-apple-lg">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors",
                  value === option.value && "bg-accent"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
