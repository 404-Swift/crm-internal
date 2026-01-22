import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { PipelineBoard } from '@/components/organisms/PipelineBoard'
import { Button } from '@/components/atoms/Button'
import { Plus } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DealForm } from '@/components/molecules/DealForm'

export default function Deals() {
  const [showCreateForm, setShowCreateForm] = useState(false)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
            <p className="text-muted-foreground mt-2">
              Manage your sales pipeline
            </p>
          </div>
          <Button onClick={() => setShowCreateForm(true)}>
            <Icon icon={Plus} className="mr-2" size={18} />
            Add Deal
          </Button>
        </div>
        <PipelineBoard />

        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogContent onClose={() => setShowCreateForm(false)}>
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
              <DialogDescription>
                Create a new deal in your pipeline. All fields marked with * are required.
              </DialogDescription>
            </DialogHeader>
            <DealForm
              onSuccess={() => setShowCreateForm(false)}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
