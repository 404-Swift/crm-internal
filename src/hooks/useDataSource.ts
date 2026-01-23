import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSourceOfTruth, setSourceOfTruth, type SourceType } from '@/services/supabase/data-source-config'

export function useDataSource() {
  const queryClient = useQueryClient()

  const { data: sourceOfTruth = 'supabase', isLoading } = useQuery<SourceType>({
    queryKey: ['dataSource'],
    queryFn: getSourceOfTruth,
    staleTime: 5 * 60 * 1000, // 5 minutes - source of truth doesn't change often
  })

  const setSourceMutation = useMutation({
    mutationFn: setSourceOfTruth,
    onSuccess: () => {
      // Invalidate data source query
      queryClient.invalidateQueries({ queryKey: ['dataSource'] })
      // Invalidate all data queries so they refetch from new source
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      queryClient.invalidateQueries({ queryKey: ['activities'] })
    },
  })

  return {
    sourceOfTruth,
    setSourceOfTruth: setSourceMutation.mutateAsync,
    isSetting: setSourceMutation.isPending,
    isLoading,
  }
}
