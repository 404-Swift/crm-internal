import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DashboardLayout } from '@/components/templates/DashboardLayout'
import { CalendarView } from '@/components/organisms/CalendarView'
import { Button } from '@/components/atoms/Button'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync'
import { isConnected } from '@/services/google-calendar/oauth'
import { format } from 'date-fns'
import { toast } from '@/components/ui/toaster'
import { Card, CardContent } from '@/components/ui/card'

export default function Bookings() {
  const navigate = useNavigate()
  const { sync, isSyncing, lastSyncTime } = useGoogleCalendarSync()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const calendarConnected = isConnected()

  const handleSync = async () => {
    if (!calendarConnected) {
      toast.error(
        'Not Connected',
        'Please connect Google Calendar in Settings first'
      )
      navigate('/settings')
      return
    }

    try {
      await sync({})
    } catch (error) {
      console.error('Sync error:', error)
      // Error is already handled by the hook
    }
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
              disabled={isSyncing || !calendarConnected}
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

        {!calendarConnected && (
          <Card>
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Icon icon={AlertCircle} className="text-muted-foreground mt-0.5" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Google Calendar Not Connected</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Connect your Google Calendar to sync and view bookings.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate('/settings')}
                  >
                    Go to Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {calendarConnected && lastSyncTime && (
          <div className="text-sm text-muted-foreground">
            Last synced: {format(lastSyncTime, 'PPpp')}
          </div>
        )}

        {calendarConnected ? (
          <CalendarView selectedDate={selectedDate} onDateChange={setSelectedDate} />
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Connect Google Calendar to view bookings</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
