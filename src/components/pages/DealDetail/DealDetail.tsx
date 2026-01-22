import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { ActivityTimeline } from '@/components/organisms/ActivityTimeline'
import { DealForm } from '@/components/molecules/DealForm'
import { useDeal } from '@/hooks/useDeals'
import { ArrowLeft, User, Calendar, DollarSign, Edit } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { deal, isLoading } = useDeal(id!)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-muted-foreground">Loading deal...</div>
      </DashboardLayout>
    )
  }

  if (!deal) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Deal not found</p>
          <Button onClick={() => navigate('/deals')} className="mt-4">
            Back to Deals
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/deals')}
          >
            <Icon icon={ArrowLeft} className="mr-2" size={18} />
            Back
          </Button>
          <Button
            onClick={() => setIsEditDialogOpen(true)}
            variant="outline"
          >
            <Icon icon={Edit} className="mr-2" size={18} />
            Edit Deal
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{deal.title}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">{deal.stage}</Badge>
                  <Badge variant="outline">{deal.probability}% probability</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Icon icon={DollarSign} className="text-muted-foreground" size={18} />
                  <span className="text-lg font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                    }).format(deal.amount)}
                  </span>
                </div>
                {deal.expected_close_date && (
                  <div className="flex items-center gap-3">
                    <Icon icon={Calendar} className="text-muted-foreground" size={18} />
                    <span className="text-sm">
                      Expected close: {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {deal.contact && (
                  <div className="flex items-center gap-3">
                    <Icon icon={User} className="text-muted-foreground" size={18} />
                    <Link
                      to={`/contacts/${deal.contact_id}`}
                      className="text-sm hover:underline"
                    >
                      {deal.contact.first_name} {deal.contact.last_name}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline dealId={deal.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          <DealForm
            deal={deal || null}
            onSuccess={() => {
              setIsEditDialogOpen(false)
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
