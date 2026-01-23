import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { handleCallback as handleSheetsCallback } from '@/services/google-sheets/oauth'
import { handleCallback as handleCalendarCallback } from '@/services/google-calendar/oauth'
import { toast } from '@/components/ui/toaster'
import { Card, CardContent } from '@/components/ui/card'

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')

        // Check for OAuth error
        if (error) {
          const errorDescription = searchParams.get('error_description') || error
          setErrorMessage(errorDescription)
          setStatus('error')
          toast.error('OAuth Error', errorDescription)
          setTimeout(() => {
            navigate('/settings')
          }, 3000)
          return
        }

        // Check for authorization code
        if (!code) {
          throw new Error('No authorization code received from Google')
        }

        if (!state) {
          throw new Error('No state parameter received. Possible CSRF attack.')
        }

        // Try to determine which service initiated the OAuth by checking stored state
        const sheetsState = sessionStorage.getItem('google_oauth_state')
        const calendarState = sessionStorage.getItem('google_calendar_oauth_state')
        
        let connectedServices: string[] = []
        
        // Try Google Sheets callback
        if (sheetsState === state) {
          try {
            await handleSheetsCallback(code, state)
            connectedServices.push('Google Sheets')
          } catch (error) {
            console.error('Failed to handle Sheets callback:', error)
          }
        }
        
        // Try Google Calendar callback
        if (calendarState === state) {
          try {
            await handleCalendarCallback(code, state)
            connectedServices.push('Google Calendar')
          } catch (error) {
            console.error('Failed to handle Calendar callback:', error)
          }
        }
        
        // If neither matched, try both (in case state was cleared)
        if (connectedServices.length === 0) {
          try {
            await handleSheetsCallback(code, state)
            connectedServices.push('Google Sheets')
          } catch (error) {
            // Ignore - might not be Sheets
          }
          try {
            await handleCalendarCallback(code, state)
            connectedServices.push('Google Calendar')
          } catch (error) {
            // Ignore - might not be Calendar
          }
        }

        if (connectedServices.length === 0) {
          throw new Error('Could not determine which service to connect')
        }

        setStatus('success')
        const serviceNames = connectedServices.join(' and ')
        toast.success(`${serviceNames} Connected`, `Successfully connected to ${serviceNames}`)

        // Redirect to settings after a short delay
        setTimeout(() => {
          navigate('/settings')
        }, 1500)
      } catch (error) {
        console.error('OAuth callback error:', error)
        const message = error instanceof Error ? error.message : 'Failed to connect to Google services'
        setErrorMessage(message)
        setStatus('error')
        toast.error('Connection Failed', message)
        setTimeout(() => {
          navigate('/settings')
        }, 3000)
      }
    }

    processCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Connecting to Google...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="rounded-full h-12 w-12 bg-green-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="text-foreground font-medium">Successfully connected!</p>
                <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="rounded-full h-12 w-12 bg-red-100 flex items-center justify-center">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
                <p className="text-foreground font-medium">Connection failed</p>
                <p className="text-sm text-muted-foreground text-center">{errorMessage}</p>
                <p className="text-xs text-muted-foreground">Redirecting to settings...</p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
