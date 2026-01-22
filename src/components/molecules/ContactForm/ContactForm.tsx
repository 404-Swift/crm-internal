import { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { useContacts } from '@/hooks/useContacts'
import { contactSchema, type ContactFormData } from '@/lib/validations'
import { CONTACT_STATUSES, CONTACT_SOURCES } from '@/lib/constants'
import { toast } from '@/components/ui/toaster'
import type { Contact } from '@/types/contact'

interface ContactFormProps {
  contact?: Contact | null
  onSuccess?: () => void
  onCancel?: () => void
}

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const { createContact, updateContact, isCreating, isUpdating } = useContacts()
  const isEditing = !!contact
  const [formData, setFormData] = useState<ContactFormData>({
    email: contact?.email || '',
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    company: contact?.company || '',
    phone: contact?.phone || '',
    source: contact?.source || '',
    status: contact?.status || '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({})

  useEffect(() => {
    if (contact) {
      setFormData({
        email: contact.email,
        first_name: contact.first_name,
        last_name: contact.last_name,
        company: contact.company || '',
        phone: contact.phone || '',
        source: contact.source || '',
        status: contact.status || '',
      })
    }
  }, [contact])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const validated = contactSchema.parse(formData)
      if (isEditing && contact) {
        await updateContact({ id: contact.id, input: validated })
        toast.success('Contact updated', 'The contact has been updated successfully')
      } else {
        await createContact(validated)
        toast.success('Contact created', 'The contact has been added successfully')
        // Reset form only when creating
        setFormData({
          email: '',
          first_name: '',
          last_name: '',
          company: '',
          phone: '',
          source: '',
          status: '',
        })
      }
      onSuccess?.()
    } catch (err: any) {
      if (err.errors) {
        const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {}
        err.errors.forEach((error: any) => {
          if (error.path) {
            fieldErrors[error.path[0] as keyof ContactFormData] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        toast.error(
          isEditing ? 'Failed to update contact' : 'Failed to create contact',
          err.message || 'An error occurred'
        )
      }
    }
  }

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="first_name" className="text-sm font-medium">
            First Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="first_name"
            value={formData.first_name}
            onChange={(e) => handleChange('first_name', e.target.value)}
            placeholder="John"
            required
            className={errors.first_name ? 'border-destructive' : ''}
          />
          {errors.first_name && (
            <p className="text-xs text-destructive">{errors.first_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="last_name" className="text-sm font-medium">
            Last Name <span className="text-destructive">*</span>
          </label>
          <Input
            id="last_name"
            value={formData.last_name}
            onChange={(e) => handleChange('last_name', e.target.value)}
            placeholder="Doe"
            required
            className={errors.last_name ? 'border-destructive' : ''}
          />
          {errors.last_name && (
            <p className="text-xs text-destructive">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email <span className="text-destructive">*</span>
        </label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="john.doe@example.com"
          required
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-medium">
            Company
          </label>
          <Input
            id="company"
            value={formData.company || ''}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Acme Corp"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1-555-123-4567"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="source" className="text-sm font-medium">
            Source
          </label>
          <select
            id="source"
            value={formData.source || ''}
            onChange={(e) => handleChange('source', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select source</option>
            {CONTACT_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            value={formData.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">Select status</option>
            {CONTACT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isCreating || isUpdating}>
          {isCreating || isUpdating
            ? isEditing
              ? 'Updating...'
              : 'Creating...'
            : isEditing
            ? 'Update Contact'
            : 'Create Contact'}
        </Button>
      </div>
    </form>
  )
}
