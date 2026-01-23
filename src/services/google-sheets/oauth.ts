import * as oauthTokensService from '../supabase/oauth-tokens'

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

/**
 * Get the OAuth client ID from environment variables
 */
function getClientId(): string {
  const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID
  if (!clientId || clientId === 'your_google_oauth_client_id') {
    throw new Error('Google Sheets OAuth Client ID is not configured')
  }
  return clientId
}

/**
 * Get the redirect URI from environment variables
 */
function getRedirectUri(): string {
  const redirectUri = import.meta.env.VITE_GOOGLE_SHEETS_REDIRECT_URI
  if (!redirectUri) {
    // Fallback to current origin + callback path
    return `${window.location.origin}/auth/google/callback`
  }
  return redirectUri
}

/**
 * Get the Supabase Functions URL
 */
function getSupabaseFunctionsUrl(): string {
  const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
  if (!functionsUrl) {
    // Fallback: construct from Supabase URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl) {
      throw new Error('Supabase Functions URL is not configured')
    }
    // Extract project ref from Supabase URL and construct functions URL
    const url = new URL(supabaseUrl)
    return `${url.protocol}//${url.host}/functions/v1`
  }
  return functionsUrl
}

/**
 * Generate a random state string for OAuth security
 */
function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * Store state in sessionStorage for OAuth flow
 */
function storeOAuthState(state: string): void {
  sessionStorage.setItem('google_oauth_state', state)
}

/**
 * Get and clear stored OAuth state
 */
function getAndClearOAuthState(): string | null {
  const state = sessionStorage.getItem('google_oauth_state')
  if (state) {
    sessionStorage.removeItem('google_oauth_state')
  }
  return state
}

/**
 * Initiate OAuth flow by redirecting to Google
 */
export function initiateOAuth(): void {
  const clientId = getClientId()
  const redirectUri = getRedirectUri()
  const state = generateState()
  
  storeOAuthState(state)
  
  const scope = 'https://www.googleapis.com/auth/spreadsheets'
  const responseType = 'code'
  const accessType = 'offline' // Required to get refresh token
  const prompt = 'consent' // Force consent screen to get refresh token
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    scope: scope,
    state: state,
    access_type: accessType,
    prompt: prompt,
  })
  
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  window.location.href = authUrl
}

/**
 * Exchange authorization code for access and refresh tokens
 */
async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const functionsUrl = getSupabaseFunctionsUrl()
  const endpoint = `${functionsUrl}/exchange-google-token`
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key is not configured')
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      code,
      redirect_uri: redirectUri,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to exchange authorization code: ${response.statusText}`)
  }
  
  return response.json()
}

/**
 * Handle OAuth callback - exchange code for tokens and store them
 */
export async function handleCallback(code: string, state: string): Promise<void> {
  // Verify state to prevent CSRF attacks
  const storedState = getAndClearOAuthState()
  if (!storedState || storedState !== state) {
    throw new Error('Invalid OAuth state. Possible CSRF attack.')
  }
  
  const redirectUri = getRedirectUri()
  const tokenResponse = await exchangeCodeForTokens(code, redirectUri)
  
  // Calculate expiration time (expires_in is in seconds)
  const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
  
  // Store tokens in Supabase (company-wide, shared by all users)
  await oauthTokensService.storeTokens(
    'google_sheets',
    tokenResponse.access_token,
    tokenResponse.refresh_token,
    expiresAt
  )
}

/**
 * Get stored tokens from Supabase (company-wide)
 */
export async function getStoredTokens(): Promise<StoredTokens | null> {
  return await oauthTokensService.getStoredTokens('google_sheets')
}

/**
 * Check if the access token is expired or will expire soon (within 5 minutes)
 */
export async function isTokenExpired(tokens: StoredTokens | null = null): Promise<boolean> {
  const storedTokens = tokens || await getStoredTokens()
  if (!storedTokens) {
    return true
  }
  
  // Consider token expired if it expires within 5 minutes
  const bufferTime = 5 * 60 * 1000 // 5 minutes in milliseconds
  return Date.now() >= (storedTokens.expiresAt - bufferTime)
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshToken(): Promise<string> {
  const tokens = await getStoredTokens()
  if (!tokens) {
    throw new Error('No stored tokens found. Please reconnect Google Sheets.')
  }
  
  const functionsUrl = getSupabaseFunctionsUrl()
  const endpoint = `${functionsUrl}/exchange-google-token`
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const redirectUri = getRedirectUri()
  
  if (!supabaseAnonKey) {
    throw new Error('Supabase anon key is not configured')
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      refresh_token: tokens.refreshToken,
      redirect_uri: redirectUri,
    }),
  })
  
  if (!response.ok) {
    // If refresh fails, clear tokens and require re-authentication
    await clearTokens()
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to refresh token: ${response.statusText}`)
  }
  
  const tokenResponse: TokenResponse = await response.json()
  
  // Update stored tokens in Supabase (company-wide)
  const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
  await oauthTokensService.updateTokens(
    'google_sheets',
    tokenResponse.access_token,
    tokenResponse.refresh_token,
    expiresAt
  )
  
  return tokenResponse.access_token
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens()
  if (!tokens) {
    return null
  }
  
  if (await isTokenExpired(tokens)) {
    try {
      return await refreshToken()
    } catch (error) {
      console.error('Failed to refresh token:', error)
      return null
    }
  }
  
  return tokens.accessToken
}

/**
 * Clear stored tokens (for disconnect)
 */
export async function clearTokens(): Promise<void> {
  await oauthTokensService.clearTokens('google_sheets')
  sessionStorage.removeItem('google_oauth_state')
}

/**
 * Check if company is connected (has valid tokens or refresh token)
 * Returns true if we have a refresh token, even if access token is expired
 * (since we can refresh it automatically)
 */
export async function isConnected(): Promise<boolean> {
  try {
    return await oauthTokensService.hasTokens('google_sheets')
  } catch {
    return false
  }
}
