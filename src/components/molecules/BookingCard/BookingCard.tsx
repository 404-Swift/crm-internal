import { format, parseISO } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types/booking'
import { BookingDetailModal } from '@/components/molecules/BookingDetailModal'
import { useState } from 'react'
import { getTeamMemberColor, getUnassignedColor } from '@/lib/teamMemberColors'

interface BookingCardProps {
  booking: Booking
  compact?: boolean
}

export function BookingCard({ booking, compact = false }: BookingCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const startTime = parseISO(booking.start_time)
  const endTime = parseISO(booking.end_time)
  const assignedTeamMembers = booking.team_members || []
  
  // Determine card color based on assignments
  const cardColor = assignedTeamMembers.length > 0
    ? getTeamMemberColor(assignedTeamMembers[0].team_member_id)
    : getUnassignedColor()

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer hover:opacity-80 transition-all border-l-4",
          compact && "p-1 text-xs",
          assignedTeamMembers.length > 0 ? cardColor : "border-l-muted"
        )}
        style={assignedTeamMembers.length > 0 ? {
          borderLeftColor: 'transparent',
        } : {}}
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
                {booking.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {booking.description}
                  </div>
                )}
                {booking.location && (
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    📍 {booking.location}
                  </div>
                )}
                {booking.contact && (
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    👤 {booking.contact.first_name} {booking.contact.last_name}
                  </div>
                )}
                {booking.deal && (
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    💼 {booking.deal.title}
                  </div>
                )}
                {assignedTeamMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {assignedTeamMembers.slice(0, 3).map(tm => {
                      const memberColor = getTeamMemberColor(tm.team_member_id)
                      return (
                        <Badge 
                          key={tm.id} 
                          className={cn("text-xs text-white", memberColor)}
                        >
                          {tm.team_member.name}
                        </Badge>
                      )
                    })}
                    {assignedTeamMembers.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{assignedTeamMembers.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                {assignedTeamMembers.length === 0 && (
                  <div className="text-xs text-muted-foreground italic mt-1">
                    Unassigned
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
