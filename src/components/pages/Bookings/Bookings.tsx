import { useState } from 'react'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { CalendarView } from '@/components/organisms/CalendarView'
import { Button } from '@/components/atoms/Button'
import { RefreshCw, Calendar as CalendarIcon } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync'
import { format } from 'date-fns'

export default function Bookings() {
  const { sync, isSyncing, lastSyncTime } = useGoogleCalendarSync()
  const [selectedDate, setSelectedDate] = useState(new Date())

  const handleSync = async () => {
    await sync()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your scheduled bookings
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <Icon
                icon={RefreshCw}
                className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}
                size={18}
              />
              {isSyncing ? 'Syncing...' : 'Sync Calendar'}
            </Button>
          </div>
        </div>

        {lastSyncTime && (
          <div className="text-sm text-muted-foreground">
            Last synced: {format(lastSyncTime, 'PPpp')}
          </div>
        )}

        <CalendarView selectedDate={selectedDate} onDateChange={setSelectedDate} />
      </div>
    </DashboardLayout>
  )
}
