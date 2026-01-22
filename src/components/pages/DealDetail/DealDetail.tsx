import { useParams, useNavigate, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { ActivityTimeline } from '@/components/organisms/ActivityTimeline'
import { useDeal } from '@/hooks/useDeals'
import { ArrowLeft, User, Calendar, DollarSign } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { format } from 'date-fns'

export default function DealDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { deal, isLoading } = useDeal(id!)

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
        <Button
          variant="ghost"
          onClick={() => navigate('/deals')}
          className="mb-4"
        >
          <Icon icon={ArrowLeft} className="mr-2" size={18} />
          Back
        </Button>

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
    </DashboardLayout>
  )
}
