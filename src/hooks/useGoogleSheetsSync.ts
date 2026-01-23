import { useMutation } from '@tanstack/react-query'
import { syncAllDataToGoogleSheets, syncContactToGoogleSheets, syncDealToGoogleSheets, syncFromGoogleSheets } from '@/services/google-sheets/sync'
import { useAuth } from './useAuth'

export function useGoogleSheetsSync() {
  const { user } = useAuth()

  const syncAllMutation = useMutation({
    mutationFn: () => syncAllDataToGoogleSheets(user!.id),
  })

  const syncContactMutation = useMutation({
    mutationFn: (contactId: string) => syncContactToGoogleSheets(contactId, user!.id),
  })

  const syncDealMutation = useMutation({
    mutationFn: (dealId: string) => syncDealToGoogleSheets(dealId, user!.id),
  })

  const syncFromSheetsMutation = useMutation({
    mutationFn: () => syncFromGoogleSheets(user!.id),
  })

  return {
    syncAll: syncAllMutation.mutateAsync,
    syncContact: syncContactMutation.mutateAsync,
    syncDeal: syncDealMutation.mutateAsync,
    syncFromSheets: syncFromSheetsMutation.mutateAsync,
    isSyncing: syncAllMutation.isPending || syncContactMutation.isPending || syncDealMutation.isPending || syncFromSheetsMutation.isPending,
  }
}
