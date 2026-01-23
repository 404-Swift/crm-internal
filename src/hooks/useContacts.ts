import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService } from '@/services/supabase/contacts'
import { googleSheetsReadService } from '@/services/google-sheets/read'
import type { Contact, ContactFormInput } from '@/types/contact'
import { useAuth } from './useAuth'
import { useDataSource } from './useDataSource'

export function useContacts() {
  const { user } = useAuth()
  const { sourceOfTruth } = useDataSource()
  const queryClient = useQueryClient()

  const { data: contacts = [], isLoading, error } = useQuery<Contact[]>({
    queryKey: ['contacts', user?.id, sourceOfTruth],
    queryFn: async () => {
      if (sourceOfTruth === 'google_sheets') {
        return googleSheetsReadService.getAllContacts()
      }
      return contactsService.getAll(user!.id)
    },
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (input: ContactFormInput) =>
      contactsService.create(input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ContactFormInput> }) =>
      contactsService.update(id, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsService.delete(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', user?.id] })
    },
  })

  const searchMutation = useMutation({
    mutationFn: (query: string) => contactsService.search(query, user!.id),
  })

  return {
    contacts,
    isLoading,
    error,
    createContact: createMutation.mutateAsync,
    updateContact: updateMutation.mutateAsync,
    deleteContact: deleteMutation.mutateAsync,
    searchContacts: searchMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useContact(id: string) {
  const { user } = useAuth()
  const { sourceOfTruth } = useDataSource()

  const { data: contact, isLoading, error } = useQuery<Contact | null>({
    queryKey: ['contact', id, user?.id, sourceOfTruth],
    queryFn: async () => {
      if (sourceOfTruth === 'google_sheets') {
        const allContacts = await googleSheetsReadService.getAllContacts()
        return allContacts.find(c => c.id === id) || null
      }
      return contactsService.getById(id, user!.id)
    },
    enabled: !!user && !!id,
  })

  return { contact, isLoading, error }
}
