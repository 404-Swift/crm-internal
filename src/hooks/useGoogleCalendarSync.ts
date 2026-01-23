import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncBookingsFromGoogleCalendar, getLastSyncTime, setLastSyncTime } from '@/services/google-calendar/sync'
import { isConnected } from '@/services/google-calendar/oauth'
import { useAuth } from './useAuth'
import { toast } from '@/components/ui/toaster'

export function useGoogleCalendarSync() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: async ({ calendarId, timeMin, timeMax }: {
      calendarId?: string
      timeMin?: string
      timeMax?: string
    } = {}) => {
      if (!user) throw new Error('User not authenticated')
      if (!(await isConnected())) {
        throw new Error('Google Calendar is not connected. Please connect it in Settings first.')
      }
      return syncBookingsFromGoogleCalendar(user.id, calendarId, timeMin, timeMax)
    },
    onSuccess: (result) => {
      setLastSyncTime()
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
      
      const messages: string[] = []
      if (result.synced > 0) {
        messages.push(`Synced ${result.synced} booking${result.synced !== 1 ? 's' : ''}`)
      }
      if (result.deleted > 0) {
        messages.push(`Deleted ${result.deleted} booking${result.deleted !== 1 ? 's' : ''}`)
      }
      
      if (result.errors > 0) {
        toast.show({
          title: 'Sync completed with errors',
          description: `${messages.join(', ')}. ${result.errors} error${result.errors !== 1 ? 's' : ''} occurred`,
          variant: 'default',
        })
      } else if (result.synced > 0 || result.deleted > 0) {
        toast.success(
          'Calendar synced successfully',
          messages.join(', ') + ' from Google Calendar'
        )
      } else {
        toast.success(
          'Calendar sync completed',
          'No changes detected'
        )
      }
    },
    onError: (error: Error) => {
      toast.error('Sync failed', error.message)
    },
  })

  return {
    sync: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
    lastSyncTime: getLastSyncTime(),
  }
}
