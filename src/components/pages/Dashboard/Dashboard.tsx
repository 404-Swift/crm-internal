import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { DashboardStats } from '@/components/organisms/DashboardStats'
import { Button } from '@/components/atoms/Button'
import { Plus, UserPlus, TrendingUp } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ContactForm } from '@/components/molecules/ContactForm'
import { DealForm } from '@/components/molecules/DealForm'

export default function Dashboard() {
  const [showContactForm, setShowContactForm] = useState(false)
  const [showDealForm, setShowDealForm] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Overview of your CRM activity
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowContactForm(true)}>
              <Icon icon={UserPlus} className="mr-2" size={18} />
              Add Contact
            </Button>
            <Button onClick={() => setShowDealForm(true)}>
              <Icon icon={TrendingUp} className="mr-2" size={18} />
              Add Deal
            </Button>
          </div>
        </div>
        <DashboardStats />

        <Dialog open={showContactForm} onOpenChange={setShowContactForm}>
          <DialogContent onClose={() => setShowContactForm(false)}>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>
                Create a new contact in your CRM. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <ContactForm
              onSuccess={() => setShowContactForm(false)}
              onCancel={() => setShowContactForm(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showDealForm} onOpenChange={setShowDealForm}>
          <DialogContent onClose={() => setShowDealForm(false)}>
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Create a new deal in your pipeline. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <DealForm
              onSuccess={() => setShowDealForm(false)}
              onCancel={() => setShowDealForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
