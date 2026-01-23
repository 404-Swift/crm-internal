import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types/booking'
import { BookingDetailModal } from '@/components/molecules/BookingDetailModal'
import { useState } from 'react'

interface BookingCardProps {
  booking: Booking
  compact?: boolean
}

export function BookingCard({ booking, compact = false }: BookingCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const startTime = parseISO(booking.start_time)
  const endTime = parseISO(booking.end_time)
  const assignedTeamMembers = booking.team_members || []

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer hover:bg-accent transition-colors",
          compact && "p-1 text-xs"
        )}
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className={cn("p-2", !compact && "p-4")}>
          <div className="space-y-1">
            <div className="font-medium line-clamp-1">{booking.title}</div>
            {!compact && (
              <>
                <div className="text-sm text-muted-foreground">
                  {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                </div>
                {booking.location && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    📍 {booking.location}
                  </div>
                )}
                {assignedTeamMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {assignedTeamMembers.slice(0, 3).map(tm => (
                      <Badge key={tm.id} variant="secondary" className="text-xs">
                        {tm.team_member.name}
                      </Badge>
                    ))}
                    {assignedTeamMembers.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{assignedTeamMembers.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <BookingDetailModal
        bookingId={booking.id}
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
