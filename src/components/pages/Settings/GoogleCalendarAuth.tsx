import { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/atoms/Icon'
import { CheckCircle2, XCircle, Loader2, AlertCircle, RefreshCw, Calendar } from 'lucide-react'
import { initiateOAuth, isConnected, clearTokens } from '@/services/google-calendar/oauth'
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync'
import { useAuth } from '@/hooks/useAuth'
import { getLastSyncTime } from '@/services/google-calendar/sync'
import { format } from 'date-fns'
import { toast } from '@/components/ui/toaster'

export function GoogleCalendarAuth() {
  const { user } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const { sync, isSyncing, lastSyncTime } = useGoogleCalendarSync()

  useEffect(() => {
    const checkConnection = async () => {
      try {
        if (!user) {
          setConnected(false)
          setChecking(false)
          return
        }
        const connectedStatus = await isConnected(user.id)
        setConnected(connectedStatus)
      } catch (error) {
        console.error('Error checking connection status:', error)
        setConnected(false)
      } finally {
        setChecking(false)
      }
    }

    checkConnection()

    const handleFocus = () => {
      checkConnection()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const handleConnect = () => {
    try {
      setIsConnecting(true)
      initiateOAuth()
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      toast.error(
        'Connection Error',
        error instanceof Error ? error.message : 'Failed to start Google Calendar connection'
      )
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      if (user) {
        await clearTokens(user.id)
      }
      localStorage.removeItem('google_calendar_sync_token')
      localStorage.removeItem('google_calendar_last_sync')
      setConnected(false)
      toast.success('Disconnected', 'Google Calendar has been disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Disconnect Error', 'Failed to disconnect Google Calendar')
    }
  }

  const handleSync = async () => {
    try {
      await sync({})
    } catch (error) {
      console.error('Error syncing calendar:', error)
    }
  }

  const lastSync = lastSyncTime || getLastSyncTime()

  if (checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Integration</CardTitle>
          <CardDescription>Connect your Google Calendar to sync bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Calendar Integration</CardTitle>
        <CardDescription>Connect your Google Calendar to sync bookings automatically</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <Icon icon={CheckCircle2} className="text-green-600 dark:text-green-400 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                  Connected to Google Calendar
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your bookings will sync from Google Calendar. Click "Sync Calendar" to fetch the latest events.
                </p>
                {lastSync && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Last synced: {format(lastSync, 'PPpp')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-auto"
                size="lg"
              >
                <Icon
                  icon={RefreshCw}
                  className={`mr-2 ${isSyncing ? 'animate-spin' : ''}`}
                  size={20}
                />
                {isSyncing ? 'Syncing...' : 'Sync Calendar'}
              </Button>
              <Button onClick={handleDisconnect} variant="outline" className="w-auto" size="lg">
                <Icon icon={XCircle} className="mr-2" size={20} />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Icon icon={AlertCircle} className="text-muted-foreground mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Not Connected</p>
                <p className="text-xs text-muted-foreground">
                  Connect your Google Calendar account to sync bookings. This will fetch events from your calendar
                  and display them in the Bookings page.
                </p>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-auto"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Icon icon={Calendar} className="mr-2" size={20} />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> You'll be redirected to Google to authorize read-only access to your Google Calendar.
            The connection is secure and only allows reading calendar events, not modifying them.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
