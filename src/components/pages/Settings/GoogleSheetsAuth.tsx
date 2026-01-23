import { useState, useEffect } from 'react'
import { Button } from '@/components/atoms/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Icon } from '@/components/atoms/Icon'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { initiateOAuth, isConnected, clearTokens, getStoredTokens } from '@/services/google-sheets/oauth'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/components/ui/toaster'

export function GoogleSheetsAuth() {
  const { user } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tokenInfo, setTokenInfo] = useState<{
    expiresAt: Date
    hoursUntilExpiry: number
    minutesUntilExpiry: number
    isExpiringSoon: boolean
  } | null>(null)

  useEffect(() => {
    // Check connection status on mount
    const checkConnection = async () => {
      try {
        if (!user) {
          setConnected(false)
          setChecking(false)
          return
        }
        const connectedStatus = await isConnected(user.id)
        setConnected(connectedStatus)
        
        // Get token info if connected
        if (connectedStatus) {
          const tokens = await getStoredTokens(user.id)
          if (tokens) {
            const expiresAt = new Date(tokens.expiresAt)
            const now = new Date()
            const timeUntilExpiry = expiresAt.getTime() - now.getTime()
            const hoursUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60 * 60))
            const minutesUntilExpiry = Math.floor((timeUntilExpiry % (1000 * 60 * 60)) / (1000 * 60))
            setTokenInfo({
              expiresAt,
              hoursUntilExpiry,
              minutesUntilExpiry,
              isExpiringSoon: timeUntilExpiry < 60 * 60 * 1000, // Less than 1 hour
            })
          }
        }
      } catch (error) {
        console.error('Error checking connection status:', error)
        setConnected(false)
      } finally {
        setChecking(false)
      }
    }

    checkConnection()

    // Also check when window regains focus (in case user completed OAuth in another tab)
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
      // Note: initiateOAuth() redirects, so we won't reach here
    } catch (error) {
      console.error('Error initiating OAuth:', error)
      toast.error(
        'Connection Error',
        error instanceof Error ? error.message : 'Failed to start Google Sheets connection'
      )
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      if (user) {
        await clearTokens(user.id)
      }
      setConnected(false)
      setTokenInfo(null)
      toast.success('Disconnected', 'Google Sheets has been disconnected')
    } catch (error) {
      console.error('Error disconnecting:', error)
      toast.error('Disconnect Error', 'Failed to disconnect Google Sheets')
    }
  }

  if (checking) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets Integration</CardTitle>
          <CardDescription>Connect your Google Sheets for automatic synchronization</CardDescription>
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
        <CardTitle>Google Sheets Integration</CardTitle>
        <CardDescription>Connect your Google Sheets for automatic synchronization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connected ? (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <Icon icon={CheckCircle2} className="text-green-600 dark:text-green-400 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                  Connected to Google Sheets
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Your CRM data will automatically sync with Google Sheets. Write operations are enabled.
                  Sync is permanent and will continue automatically.
                </p>
                {tokenInfo && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400">
                      Access token will auto-refresh when needed. Sync remains active permanently.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleDisconnect} variant="outline" className="w-auto" size="lg">
              <Icon icon={XCircle} className="mr-2" size={20} />
              Disconnect Google Sheets
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
              <Icon icon={AlertCircle} className="text-muted-foreground mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Not Connected</p>
                <p className="text-xs text-muted-foreground">
                  Connect your Google Sheets account to enable automatic synchronization. This allows the CRM to
                  write data to your Google Sheets in the background.
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
                  <Icon icon={CheckCircle2} className="mr-2" size={20} />
                  Connect Google Sheets
                </>
              )}
            </Button>
          </>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> You'll be redirected to Google to authorize access to your Google Sheets.
            The connection is secure and only grants access to the specific spreadsheet configured in your
            environment variables.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
