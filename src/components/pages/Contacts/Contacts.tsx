import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { ContactsList } from '@/components/organisms/ContactsList'
import { Button } from '@/components/atoms/Button'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ContactForm } from '@/components/molecules/ContactForm'

type ViewMode = 'grid' | 'list'

export default function Contacts() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

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
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8"
              >
                <Icon icon={LayoutGrid} size={16} />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <Icon icon={List} size={16} />
              </Button>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Icon icon={Plus} className="mr-2" size={18} />
              Add Contact
            </Button>
          </div>
        </div>
        <ContactsList viewMode={viewMode} />

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
