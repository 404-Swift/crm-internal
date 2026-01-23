import { useState } from 'react'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/atoms/Button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'

interface TeamMemberSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function TeamMemberSelector({ selectedIds, onChange, disabled }: TeamMemberSelectorProps) {
  const { teamMembers, isLoading } = useTeamMembers()
  const [isOpen, setIsOpen] = useState(false)

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading team members...</div>
  }

  const handleToggle = (teamMemberId: string) => {
    if (disabled) return
    
    if (selectedIds.includes(teamMemberId)) {
      onChange(selectedIds.filter(id => id !== teamMemberId))
    } else {
      onChange([...selectedIds, teamMemberId])
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full justify-between"
      >
        <span>
          {selectedIds.length === 0
            ? 'Select team members'
            : `${selectedIds.length} team member${selectedIds.length === 1 ? '' : 's'} selected`}
        </span>
        <Icon icon={isOpen ? ChevronUp : ChevronDown} size={18} />
      </Button>

      {isOpen && (
        <div className="border rounded-lg p-2 max-h-60 overflow-y-auto space-y-2">
          {teamMembers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No team members available
            </div>
          ) : (
            teamMembers.map(teamMember => (
              <label
                key={teamMember.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <Checkbox
                  checked={selectedIds.includes(teamMember.id)}
                  onCheckedChange={() => handleToggle(teamMember.id)}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{teamMember.name}</div>
                  <div className="text-xs text-muted-foreground">{teamMember.email}</div>
                  {teamMember.role && (
                    <div className="text-xs text-muted-foreground">{teamMember.role}</div>
                  )}
                </div>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}
