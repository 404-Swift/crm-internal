import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dealsService } from '@/services/supabase/deals'
import type { Deal, DealFormInput } from '@/types/deal'
import { useAuth } from './useAuth'

export function useDeals() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: deals = [], isLoading, error } = useQuery<Deal[]>({
    queryKey: ['deals', user?.id],
    queryFn: () => dealsService.getAll(user!.id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (input: DealFormInput) =>
      dealsService.create(input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', user?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DealFormInput> }) =>
      dealsService.update(id, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', user?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsService.delete(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals', user?.id] })
    },
  })

  return {
    deals,
    isLoading,
    error,
    createDeal: createMutation.mutateAsync,
    updateDeal: updateMutation.mutateAsync,
    deleteDeal: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDeal(id: string) {
  const { user } = useAuth()

  const { data: deal, isLoading, error } = useQuery<Deal | null>({
    queryKey: ['deal', id, user?.id],
    queryFn: () => dealsService.getById(id, user!.id),
    enabled: !!user && !!id,
  })

  return { deal, isLoading, error }
}

export function useDealsByStage(stage: string) {
  const { user } = useAuth()

  const { data: deals = [], isLoading, error } = useQuery<Deal[]>({
    queryKey: ['deals', stage, user?.id],
    queryFn: () => dealsService.getByStage(stage, user!.id),
    enabled: !!user && !!stage,
  })

  return { deals, isLoading, error }
}
