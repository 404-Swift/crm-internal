import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/atoms/Badge'
import { useDeals } from '@/hooks/useDeals'
import { DEAL_STAGES } from '@/lib/constants'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types/deal'

export function PipelineBoard() {
  const { deals, isLoading, updateDeal } = useDeals()
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)

  const dealsByStage = useMemo(() => {
    const grouped: Record<string, Deal[]> = {}
    DEAL_STAGES.forEach((stage) => {
      grouped[stage] = deals.filter((d) => d.stage === stage)
    })
    return grouped
  }, [deals])

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStage: string) => {
    if (draggedDeal && draggedDeal.stage !== newStage) {
      await updateDeal({
        id: draggedDeal.id,
        input: { stage: newStage },
      })
    }
    setDraggedDeal(null)
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading pipeline...</div>
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {DEAL_STAGES.map((stage) => (
        <div
          key={stage}
          className="flex-shrink-0 w-80"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(stage)}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold capitalize">
                {stage.replace('-', ' ')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {dealsByStage[stage]?.length || 0} deals
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {dealsByStage[stage]?.map((deal) => (
                <Link key={deal.id} to={`/deals/${deal.id}`}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(deal)}
                    className={cn(
                      "p-3 rounded-lg border bg-card hover:shadow-apple transition-shadow cursor-move",
                      draggedDeal?.id === deal.id && "opacity-50"
                    )}
                  >
                    <h4 className="font-medium text-sm mb-1">{deal.title}</h4>
                    {deal.contact && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {deal.contact.first_name} {deal.contact.last_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          minimumFractionDigits: 0,
                        }).format(deal.amount)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {deal.probability}%
                      </Badge>
                    </div>
                    {deal.expected_close_date && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
