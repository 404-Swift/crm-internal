import { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/toaster'
import type { TeamMemberFormInput } from '@/types/team-member'

interface TeamMemberFormProps {
  initialData?: {
    id: string
    name: string
    email: string
    role?: string | null
    is_active: boolean
  }
  onSuccess: () => void
  onCancel: () => void
}

export function TeamMemberForm({ initialData, onSuccess, onCancel }: TeamMemberFormProps) {
  const { user } = useAuth()
  const { createTeamMember, updateTeamMember, isCreating, isUpdating } = useTeamMembers()
  const [formData, setFormData] = useState<TeamMemberFormInput>({
    name: initialData?.name || '',
    email: initialData?.email || '',
    role: initialData?.role || '',
    is_active: initialData?.is_active ?? true,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        role: initialData.role || '',
        is_active: initialData.is_active,
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (initialData) {
        await updateTeamMember({
          id: initialData.id,
          input: formData,
          userId: user.id,
        })
        toast.success('Team member updated', 'The team member has been updated successfully')
      } else {
        await createTeamMember({
          input: { ...formData, user_id: user.id },
          userId: user.id,
        })
        toast.success('Team member created', 'The team member has been added successfully')
      }
      onSuccess()
    } catch (error) {
      toast.error('Operation failed', (error as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name *
        </label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email *
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium mb-1">
          Role
        </label>
        <Input
          id="role"
          value={formData.role || ''}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          placeholder="e.g., Sales, Support, Manager"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="is_active" className="text-sm font-medium">
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isCreating || isUpdating}>
          {initialData ? (isUpdating ? 'Updating...' : 'Update') : (isCreating ? 'Creating...' : 'Create')}
        </Button>
      </div>
    </form>
  )
}
