import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncBookingsFromGoogleCalendar, getLastSyncTime, setLastSyncTime } from '@/services/google-calendar/sync'
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
      return syncBookingsFromGoogleCalendar(user.id, calendarId, timeMin, timeMax)
    },
    onSuccess: (result) => {
      setLastSyncTime()
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
      if (result.errors > 0) {
        toast.show({
          title: 'Sync completed with errors',
          description: `Synced ${result.synced} bookings, ${result.errors} errors occurred`,
          variant: 'default',
        })
      } else {
        toast.success(
          'Calendar synced successfully',
          `Synced ${result.synced} bookings from Google Calendar`
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
