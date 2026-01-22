export const DEAL_STAGES = [
  'prospecting',
  'qualification',
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost',
] as const

export const CONTACT_STATUSES = [
  'lead',
  'qualified',
  'customer',
  'inactive',
] as const

export const ACTIVITY_TYPES = [
  'call',
  'email',
  'meeting',
  'note',
] as const

export const CONTACT_SOURCES = [
  'website',
  'referral',
  'social',
  'advertisement',
  'other',
] as const

export type DealStage = typeof DEAL_STAGES[number]
export type ContactStatus = typeof CONTACT_STATUSES[number]
export type ActivityType = typeof ACTIVITY_TYPES[number]
export type ContactSource = typeof CONTACT_SOURCES[number]
