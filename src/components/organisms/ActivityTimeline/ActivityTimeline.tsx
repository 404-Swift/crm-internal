import { useQuery } from '@tanstack/react-query'
import { activitiesService } from '@/services/supabase/activities'
import { ActivityItem } from '@/components/molecules/ActivityItem'
import { useAuth } from '@/hooks/useAuth'
import type { Activity } from '@/types/activity'

interface ActivityTimelineProps {
  contactId?: string
  dealId?: string
}

export function ActivityTimeline({ contactId, dealId }: ActivityTimelineProps) {
  const { user } = useAuth()

  const { data: activities = [], isLoading } = useQuery<Activity[]>({
    queryKey: ['activities', contactId, dealId, user?.id],
    queryFn: async () => {
      if (contactId) {
        return activitiesService.getByContact(contactId, user!.id)
      }
      if (dealId) {
        return activitiesService.getByDeal(dealId, user!.id)
      }
      return activitiesService.getAll(user!.id)
    },
    enabled: !!user && (!!contactId || !!dealId || true),
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading activities...</div>
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activities yet
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
