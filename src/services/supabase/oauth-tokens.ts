import { supabase } from './client'

export type ServiceType = 'google_calendar' | 'google_sheets'

export interface OAuthTokens {
  id: string
  user_id: string
  service_type: ServiceType
  access_token: string
  refresh_token: string
  expires_at: string
  created_at: string
  updated_at: string
}

export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Store OAuth tokens in Supabase for a user
 */
export async function storeTokens(
  userId: string,
  serviceType: ServiceType,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  const expiresAtDate = new Date(expiresAt).toISOString()

  const { error } = await supabase
    .from('oauth_tokens')
    .upsert({
      user_id: userId,
      service_type: serviceType,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAtDate,
    }, {
      onConflict: 'user_id,service_type',
    })

  if (error) {
    throw new Error(`Failed to store OAuth tokens: ${error.message}`)
  }
}

/**
 * Get stored OAuth tokens from Supabase for a user
 */
export async function getStoredTokens(
  userId: string,
  serviceType: ServiceType
): Promise<StoredTokens | null> {
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service_type', serviceType)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No tokens found
      return null
    }
    throw new Error(`Failed to get OAuth tokens: ${error.message}`)
  }

  if (!data) {
    return null
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at).getTime(),
  }
}

/**
 * Update OAuth tokens in Supabase (for token refresh)
 */
export async function updateTokens(
  userId: string,
  serviceType: ServiceType,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number
): Promise<void> {
  const updateData: Partial<OAuthTokens> = {
    access_token: accessToken,
  }

  if (refreshToken) {
    updateData.refresh_token = refreshToken
  }

  if (expiresAt) {
    updateData.expires_at = new Date(expiresAt).toISOString()
  }

  const { error } = await supabase
    .from('oauth_tokens')
    .update(updateData)
    .eq('user_id', userId)
    .eq('service_type', serviceType)

  if (error) {
    throw new Error(`Failed to update OAuth tokens: ${error.message}`)
  }
}

/**
 * Clear OAuth tokens from Supabase (for disconnect)
 */
export async function clearTokens(
  userId: string,
  serviceType: ServiceType
): Promise<void> {
  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('service_type', serviceType)

  if (error) {
    throw new Error(`Failed to clear OAuth tokens: ${error.message}`)
  }
}

/**
 * Check if user has OAuth tokens for a service
 */
export async function hasTokens(
  userId: string,
  serviceType: ServiceType
): Promise<boolean> {
  const tokens = await getStoredTokens(userId, serviceType)
  return tokens !== null && !!tokens.refreshToken
}
