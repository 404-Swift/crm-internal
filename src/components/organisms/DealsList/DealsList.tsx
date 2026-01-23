import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/atoms/Badge'
import { useDeals } from '@/hooks/useDeals'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types/deal'

export function DealsList() {
  const { deals, isLoading } = useDeals()

  const sortedDeals = useMemo(() => {
    return [...deals].sort((a, b) => {
      // Sort by updated_at descending (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [deals])

  if (isLoading) {
    return <div className="text-muted-foreground">Loading deals...</div>
  }

  if (sortedDeals.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No deals yet
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sortedDeals.map((deal) => (
        <Link key={deal.id} to={`/deals/${deal.id}`}>
          <Card className="hover:shadow-apple-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-sm truncate">{deal.title}</h3>
                    <Badge variant="secondary" className="text-xs capitalize flex-shrink-0">
                      {deal.stage.replace('-', ' ')}
                    </Badge>
                  </div>
                  {deal.contact && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="truncate">
                        {deal.contact.first_name} {deal.contact.last_name}
                      </span>
                      {deal.contact.email && (
                        <span className="truncate">{deal.contact.email}</span>
                      )}
                      {deal.contact.company && (
                        <span className="truncate">{deal.contact.company}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                      }).format(deal.amount)}
                    </div>
                    {deal.expected_close_date && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {deal.probability}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
