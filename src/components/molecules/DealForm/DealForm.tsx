import { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { useDeals } from '@/hooks/useDeals'
import { useContacts } from '@/hooks/useContacts'
import { dealSchema, type DealFormData } from '@/lib/validations'
import { DEAL_STAGES } from '@/lib/constants'
import { toast } from '@/components/ui/toaster'
import type { Deal } from '@/types/deal'

interface DealFormProps {
  deal?: Deal | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function DealForm({ deal, onSuccess, onCancel }: DealFormProps) {
  const { createDeal, updateDeal, isCreating, isUpdating } = useDeals()
  const { contacts, isLoading: contactsLoading } = useContacts()
  const isEditing = !!deal
  const [formData, setFormData] = useState<Omit<DealFormData, 'contact_id'> & { contact_id: string }>({
    title: deal?.title || '',
    contact_id: deal?.contact_id || '',
    amount: deal?.amount || 0,
    stage: deal?.stage || 'prospecting',
    probability: deal?.probability || 50,
    expected_close_date: deal?.expected_close_date || '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof DealFormData, string>>>({})

  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        contact_id: deal.contact_id,
        amount: deal.amount,
        stage: deal.stage,
        probability: deal.probability,
        expected_close_date: deal.expected_close_date || '',
      })
    }
  }, [deal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      if (!formData.contact_id) {
        setErrors({ contact_id: 'Please select a contact' })
        return
      }

      const validated = dealSchema.parse({
        ...formData,
        amount: Number(formData.amount),
        probability: Number(formData.probability),
      })
      if (isEditing && deal) {
        await updateDeal({ id: deal.id, input: validated })
        toast.success('Deal updated', 'The deal has been updated successfully')
      } else {
        await createDeal(validated)
        toast.success('Deal created', 'The deal has been added successfully')
        // Reset form only when creating
        setFormData({
          title: '',
          contact_id: '',
          amount: 0,
          stage: 'prospecting',
          probability: 50,
          expected_close_date: '',
        })
      }
      onSuccess?.()
    } catch (err: any) {
      if (err.errors) {
        const fieldErrors: Partial<Record<keyof DealFormData, string>> = {}
        err.errors.forEach((error: any) => {
          if (error.path) {
            fieldErrors[error.path[0] as keyof DealFormData] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        toast.error(
          isEditing ? 'Failed to update deal' : 'Failed to create deal',
          err.message || 'An error occurred'
        )
      }
    }
  }

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof DealFormData]) {
      setErrors((prev) => ({ ...prev, [field as keyof DealFormData]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          Deal Title <span className="text-destructive">*</span>
        </label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Q1 Enterprise License"
          required
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="contact_id" className="text-sm font-medium">
          Contact <span className="text-destructive">*</span>
        </label>
        <select
          id="contact_id"
          value={formData.contact_id}
          onChange={(e) => handleChange('contact_id', e.target.value)}
          required
          disabled={contactsLoading}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        >
          <option value="">Select a contact</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.first_name} {contact.last_name} {contact.company ? `(${contact.company})` : ''}
            </option>
          ))}
        </select>
        {errors.contact_id && (
          <p className="text-xs text-destructive">{errors.contact_id}</p>
        )}
        {contacts.length === 0 && !contactsLoading && (
          <p className="text-xs text-muted-foreground">
            No contacts available. Please create a contact first.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount <span className="text-destructive">*</span>
          </label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount || ''}
            onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
            placeholder="50000"
            required
            className={errors.amount ? 'border-destructive' : ''}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="probability" className="text-sm font-medium">
            Win Probability (%)
          </label>
          <Input
            id="probability"
            type="number"
            min="0"
            max="100"
            value={formData.probability}
            onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
            className={errors.probability ? 'border-destructive' : ''}
          />
          {errors.probability && (
            <p className="text-xs text-destructive">{errors.probability}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="stage" className="text-sm font-medium">
            Stage <span className="text-destructive">*</span>
          </label>
          <select
            id="stage"
            value={formData.stage}
            onChange={(e) => handleChange('stage', e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {DEAL_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.charAt(0).toUpperCase() + stage.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="expected_close_date" className="text-sm font-medium">
            Expected Close Date
          </label>
          <Input
            id="expected_close_date"
            type="date"
            value={formData.expected_close_date || ''}
            onChange={(e) => handleChange('expected_close_date', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isCreating || isUpdating || (!isEditing && contacts.length === 0)}>
          {isCreating || isUpdating
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
            ? 'Update Deal'
            : 'Create Deal'}
        </Button>
      </div>
    </form>
  )
}
