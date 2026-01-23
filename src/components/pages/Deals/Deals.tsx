import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { PipelineBoard } from '@/components/organisms/PipelineBoard'
import { DealsList } from '@/components/organisms/DealsList'
import { Button } from '@/components/atoms/Button'
import { Plus, LayoutGrid, List } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DealForm } from '@/components/molecules/DealForm'

type ViewMode = 'board' | 'list'

export default function Deals() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('board')

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
          <div className="flex items-center gap-2">
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'board' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('board')}
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
              Add Deal
            </Button>
          </div>
        </div>
        {viewMode === 'board' ? <PipelineBoard /> : <DealsList />}

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
