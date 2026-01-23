import { supabase } from './client'
import type { Database } from './types'

export type ServiceType = 'google_calendar' | 'google_sheets'

type OAuthTokensRow = Database['public']['Tables']['oauth_tokens']['Row']
type OAuthTokensInsert = Database['public']['Tables']['oauth_tokens']['Insert']
type OAuthTokensUpdate = Database['public']['Tables']['oauth_tokens']['Update']

export interface OAuthTokens extends OAuthTokensRow {}

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

  // First, try to get existing tokens
  const existing = await getStoredTokens(serviceType)

  if (existing) {
    // Update existing tokens
    await updateTokens(serviceType, accessToken, refreshToken, expiresAt)
  } else {
    // Insert new tokens
    const insert: OAuthTokensInsert = {
      service_type: serviceType,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAtDate,
    }

    const { error } = await (supabase
      .from('oauth_tokens') as any)
      .insert(insert)

    if (error) {
      // If insert fails due to conflict, try update instead
      if (error.code === '23505') {
        await updateTokens(serviceType, accessToken, refreshToken, expiresAt)
      } else {
        throw new Error(`Failed to store OAuth tokens: ${error.message}`)
      }
    }
  }
}

/**
 * Get stored OAuth tokens from Supabase (company-wide)
 */
export async function getStoredTokens(
  serviceType: ServiceType
): Promise<StoredTokens | null> {
  try {
    const { data, error } = await (supabase
      .from('oauth_tokens') as any)
      .select('*')
      .eq('service_type', serviceType)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No tokens found
        return null
      }
      // If 406 error, table might not exist or RLS is blocking - return null to allow insert
      if (error.message?.includes('406') || error.status === 406) {
        console.warn('OAuth tokens table may not be accessible:', error.message)
        return null
      }
      throw new Error(`Failed to get OAuth tokens: ${error.message}`)
    }

    if (!data) {
      return null
    }

    const row = data as OAuthTokensRow

    return {
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: new Date(row.expires_at).getTime(),
    }
  } catch (error: any) {
    // If table doesn't exist or any other error, return null to allow insert attempt
    console.warn('Error getting OAuth tokens, will try to insert:', error)
    return null
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
  const updateData: OAuthTokensUpdate = {
    access_token: accessToken,
  }

  if (refreshToken) {
    updateData.refresh_token = refreshToken
  }

  if (expiresAt) {
    updateData.expires_at = new Date(expiresAt).toISOString()
  }

  const { error } = await (supabase
    .from('oauth_tokens') as any)
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
