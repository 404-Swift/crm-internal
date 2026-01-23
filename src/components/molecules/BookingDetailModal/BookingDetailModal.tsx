import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useBooking } from '@/hooks/useBookings'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/atoms/Badge'
import { TeamMemberSelector } from '@/components/molecules/TeamMemberSelector'
import { useBookings } from '@/hooks/useBookings'
import { Card, CardContent } from '@/components/ui/card'

interface BookingDetailModalProps {
  bookingId: string
  open: boolean
  onClose: () => void
}

export function BookingDetailModal({ bookingId, open, onClose }: BookingDetailModalProps) {
  const { booking, isLoading } = useBooking(bookingId)
  const { assignTeamMember, unassignTeamMember } = useBookings()
  const [isAssigning, setIsAssigning] = useState(false)

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="text-muted-foreground">Loading booking details...</div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!booking) {
    return null
  }

  const startTime = parseISO(booking.start_time)
  const endTime = parseISO(booking.end_time)
  const assignedTeamMembers = booking.team_members || []
  const assignedTeamMemberIds = assignedTeamMembers.map(tm => tm.team_member_id)

  const handleTeamMemberChange = async (teamMemberIds: string[]) => {
    setIsAssigning(true)
    try {
      // Find members to add and remove
      const toAdd = teamMemberIds.filter(id => !assignedTeamMemberIds.includes(id))
      const toRemove = assignedTeamMemberIds.filter(id => !teamMemberIds.includes(id))

      // Add new assignments
      await Promise.all(
        toAdd.map(teamMemberId => assignTeamMember({ bookingId: booking.id, teamMemberId }))
      )

      // Remove unassigned members
      await Promise.all(
        toRemove.map(teamMemberId => unassignTeamMember({ bookingId: booking.id, teamMemberId }))
      )
    } catch (error) {
      console.error('Failed to update team members:', error)
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{booking.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Time and Location */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Start Time</div>
                <div className="font-medium">{format(startTime, 'PPpp')}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">End Time</div>
                <div className="font-medium">{format(endTime, 'PPpp')}</div>
              </CardContent>
            </Card>
          </div>

          {booking.location && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Location</div>
                <div className="font-medium">{booking.location}</div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {booking.description && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Description</div>
                <div className="text-sm whitespace-pre-wrap">{booking.description}</div>
              </CardContent>
            </Card>
          )}

          {/* Related Contact/Deal */}
          {(booking.contact || booking.deal) && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">Related</div>
                <div className="space-y-1">
                  {booking.contact && (
                    <div>
                      <span className="text-xs text-muted-foreground">Contact: </span>
                      <span className="text-sm">
                        {booking.contact.first_name} {booking.contact.last_name}
                      </span>
                    </div>
                  )}
                  {booking.deal && (
                    <div>
                      <span className="text-xs text-muted-foreground">Deal: </span>
                      <span className="text-sm">{booking.deal.title}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Team Members Assignment */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground mb-3">Assigned Team Members</div>
              <TeamMemberSelector
                selectedIds={assignedTeamMemberIds}
                onChange={handleTeamMemberChange}
                disabled={isAssigning}
              />
              {assignedTeamMembers.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {assignedTeamMembers.map(tm => (
                    <Badge key={tm.id} variant="secondary">
                      {tm.team_member.name}
                      {tm.team_member.role && (
                        <span className="ml-1 text-xs opacity-70">({tm.team_member.role})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
