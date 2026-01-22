import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { ContactsList } from '@/components/organisms/ContactsList'
import { Button } from '@/components/atoms/Button'
import { Plus } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ContactForm } from '@/components/molecules/ContactForm'

export default function Contacts() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
            <p className="text-muted-foreground mt-2">
              Manage your contacts and leads
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Icon icon={Plus} className="mr-2" size={18} />
            Add Contact
          </Button>
        </div>
        <ContactsList />

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent onClose={() => setShowCreateForm(false)}>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Create a new contact in your CRM. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <ContactForm
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
