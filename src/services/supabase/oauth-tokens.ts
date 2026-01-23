import { supabase } from './client'

export type ServiceType = 'google_calendar' | 'google_sheets'

export interface OAuthTokens {
  id: string
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
 * Store OAuth tokens in Supabase (company-wide, shared by all users)
 */
export async function storeTokens(
  serviceType: ServiceType,
  accessToken: string,
  refreshToken: string,
  expiresAt: number
): Promise<void> {
  const expiresAtDate = new Date(expiresAt).toISOString()

  const { error } = await supabase
    .from('oauth_tokens')
    .upsert({
      service_type: serviceType,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAtDate,
    }, {
      onConflict: 'service_type',
    })

  if (error) {
    throw new Error(`Failed to store OAuth tokens: ${error.message}`)
  }
}

/**
 * Get stored OAuth tokens from Supabase (company-wide)
 */
export async function getStoredTokens(
  serviceType: ServiceType
): Promise<StoredTokens | null> {
  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
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
    .eq('service_type', serviceType)

  if (error) {
    throw new Error(`Failed to update OAuth tokens: ${error.message}`)
  }
}

/**
 * Clear OAuth tokens from Supabase (for disconnect)
 */
export async function clearTokens(
  serviceType: ServiceType
): Promise<void> {
  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('service_type', serviceType)

  if (error) {
    throw new Error(`Failed to clear OAuth tokens: ${error.message}`)
  }
}

/**
 * Check if OAuth tokens exist for a service (company-wide)
 */
export async function hasTokens(
  serviceType: ServiceType
): Promise<boolean> {
  const tokens = await getStoredTokens(serviceType)
  return tokens !== null && !!tokens.refreshToken
}
