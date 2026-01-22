import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { activitiesService } from '@/services/supabase/activities'
import type { Activity, ActivityFormInput } from '@/types/activity'
import { useAuth } from './useAuth'

export function useActivities(contactId?: string, dealId?: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: activities = [], isLoading, error } = useQuery<Activity[]>({
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
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (input: ActivityFormInput) =>
      activitiesService.create(input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activitiesService.delete(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  return {
    activities,
    isLoading,
    error,
    createActivity: createMutation.mutateAsync,
    deleteActivity: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
