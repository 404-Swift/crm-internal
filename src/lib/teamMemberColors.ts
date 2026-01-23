/**
 * Team Member Color Utility
 * 
 * Assigns consistent colors to team members based on their ID/email hash.
 * Ensures the same team member always gets the same color.
 */

const TEAM_MEMBER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-red-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-lime-500',
  'bg-yellow-500',
  'bg-rose-500',
  'bg-fuchsia-500',
]

const TEXT_COLORS = [
  'text-blue-50',
  'text-green-50',
  'text-purple-50',
  'text-orange-50',
  'text-pink-50',
  'text-indigo-50',
  'text-teal-50',
  'text-cyan-50',
  'text-amber-50',
  'text-red-50',
  'text-violet-50',
  'text-emerald-50',
  'text-lime-50',
  'text-yellow-50',
  'text-rose-50',
  'text-fuchsia-50',
]

/**
 * Simple hash function to convert string to number
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get consistent background color for a team member
 */
export function getTeamMemberColor(teamMemberId: string): string {
  const hash = hashString(teamMemberId)
  return TEAM_MEMBER_COLORS[hash % TEAM_MEMBER_COLORS.length]
}

/**
 * Get consistent text color for a team member (for use with background)
 */
export function getTeamMemberTextColor(teamMemberId: string): string {
  const hash = hashString(teamMemberId)
  return TEXT_COLORS[hash % TEXT_COLORS.length]
}

/**
 * Get color classes for a team member (background + text)
 */
export function getTeamMemberColorClasses(teamMemberId: string): {
  bg: string
  text: string
} {
  return {
    bg: getTeamMemberColor(teamMemberId),
    text: getTeamMemberTextColor(teamMemberId),
  }
}

/**
 * Get color for unassigned bookings
 */
export function getUnassignedColor(): string {
  return 'bg-muted'
}
