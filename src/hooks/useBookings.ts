import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsService } from '@/services/supabase/bookings'
import type { Booking, BookingFormInput } from '@/types/booking'
import { useAuth } from './useAuth'

export function useBookings() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: bookings = [], isLoading, error } = useQuery<Booking[]>({
    queryKey: ['bookings', user?.id],
    queryFn: () => bookingsService.getAll(user!.id),
    enabled: !!user,
  })

  const createMutation = useMutation({
    mutationFn: (input: BookingFormInput) =>
      bookingsService.create(input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BookingFormInput> }) =>
      bookingsService.update(id, input, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bookingsService.delete(id, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
    },
  })

  const assignTeamMemberMutation = useMutation({
    mutationFn: ({ bookingId, teamMemberId }: { bookingId: string; teamMemberId: string }) =>
      bookingsService.assignTeamMember(bookingId, teamMemberId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
    },
  })

  const unassignTeamMemberMutation = useMutation({
    mutationFn: ({ bookingId, teamMemberId }: { bookingId: string; teamMemberId: string }) =>
      bookingsService.unassignTeamMember(bookingId, teamMemberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', user?.id] })
    },
  })

  return {
    bookings,
    isLoading,
    error,
    createBooking: createMutation.mutateAsync,
    updateBooking: updateMutation.mutateAsync,
    deleteBooking: deleteMutation.mutateAsync,
    assignTeamMember: assignTeamMemberMutation.mutateAsync,
    unassignTeamMember: unassignTeamMemberMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useBookingsByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth()

  const { data: bookings = [], isLoading, error } = useQuery<Booking[]>({
    queryKey: ['bookings', user?.id, 'range', startDate, endDate],
    queryFn: () => bookingsService.getByDateRange(user!.id, startDate, endDate),
    enabled: !!user && !!startDate && !!endDate,
  })

  return { bookings, isLoading, error }
}

export function useBooking(id: string) {
  const { user } = useAuth()

  const { data: booking, isLoading, error } = useQuery<Booking | null>({
    queryKey: ['bookings', user?.id, id],
    queryFn: () => bookingsService.getWithTeamMembers(id, user!.id),
    enabled: !!user && !!id,
  })

  return { booking, isLoading, error }
}
