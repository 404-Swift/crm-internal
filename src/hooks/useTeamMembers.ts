import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamMembersService } from '@/services/supabase/team-members'
import type { TeamMember, TeamMemberFormInput } from '@/types/team-member'
import { useAuth } from './useAuth'

export function useTeamMembers() {
  const queryClient = useQueryClient()

  const { data: teamMembers = [], isLoading, error } = useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: () => teamMembersService.getAll(),
  })

  const createMutation = useMutation({
    mutationFn: ({ input, userId }: { input: TeamMemberFormInput; userId: string }) =>
      teamMembersService.create(input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input, userId }: { id: string; input: Partial<TeamMemberFormInput>; userId: string }) =>
      teamMembersService.update(id, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      teamMembersService.delete(id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
  })

  return {
    teamMembers,
    isLoading,
    error,
    createTeamMember: createMutation.mutateAsync,
    updateTeamMember: updateMutation.mutateAsync,
    deleteTeamMember: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useTeamMember(id: string) {
  const { data: teamMember, isLoading, error } = useQuery<TeamMember | null>({
    queryKey: ['team-members', id],
    queryFn: () => teamMembersService.getById(id),
    enabled: !!id,
  })

  return { teamMember, isLoading, error }
}
