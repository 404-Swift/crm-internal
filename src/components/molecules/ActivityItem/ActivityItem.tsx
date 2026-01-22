import { format } from 'date-fns'
import { Phone, Mail, Calendar, FileText } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { Badge } from '@/components/atoms/Badge'
import { cn } from '@/lib/utils'
import type { Activity } from '@/types/activity'

interface ActivityItemProps {
  activity: Activity
  className?: string
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: FileText,
}

export function ActivityItem({ activity, className }: ActivityItemProps) {
  const IconComponent = activityIcons[activity.type as keyof typeof activityIcons] || FileText

  return (
    <div className={cn("flex gap-4 py-4 border-b last:border-0", className)}>
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Icon icon={IconComponent} className="text-muted-foreground" size={18} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">
            {activity.type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
          </span>
        </div>
        <p className="text-sm text-foreground">{activity.description}</p>
        {(activity.contact || activity.deal) && (
          <p className="text-xs text-muted-foreground mt-1">
            {activity.contact && (
              <>Contact: {activity.contact.first_name} {activity.contact.last_name}</>
            )}
            {activity.contact && activity.deal && ' • '}
            {activity.deal && <>Deal: {activity.deal.title}</>}
          </p>
        )}
      </div>
    </div>
  )
}
