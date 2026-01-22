const STORAGE_KEY_ACCESS_TOKEN = 'google_sheets_access_token'
const STORAGE_KEY_REFRESH_TOKEN = 'google_sheets_refresh_token'
const STORAGE_KEY_TOKEN_EXPIRY = 'google_sheets_token_expiry'

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
  
  // Store tokens
  localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokenResponse.access_token)
  localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokenResponse.refresh_token)
  localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiresAt.toString())
}

/**
 * Get stored tokens from localStorage
 */
export function getStoredTokens(): StoredTokens | null {
  const accessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)
  const refreshToken = localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
  const expiresAtStr = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY)
  
  if (!accessToken || !refreshToken || !expiresAtStr) {
    return null
  }
  
  return {
    accessToken,
    refreshToken,
    expiresAt: parseInt(expiresAtStr, 10),
  }
}

/**
 * Check if the access token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(tokens: StoredTokens | null = null): boolean {
  const storedTokens = tokens || getStoredTokens()
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
  const tokens = getStoredTokens()
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
    clearTokens()
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to refresh token: ${response.statusText}`)
  }
  
  const tokenResponse: TokenResponse = await response.json()
  
  // Update stored tokens
  const expiresAt = Date.now() + (tokenResponse.expires_in * 1000)
  localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokenResponse.access_token)
  if (tokenResponse.refresh_token) {
    // Refresh token might not be returned if it hasn't changed
    localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokenResponse.refresh_token)
  }
  localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, expiresAt.toString())
  
  return tokenResponse.access_token
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens()
  if (!tokens) {
    return null
  }
  
  if (isTokenExpired(tokens)) {
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
export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
  localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN)
  localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY)
  sessionStorage.removeItem('google_oauth_state')
}

/**
 * Check if user is connected (has valid tokens)
 */
export function isConnected(): boolean {
  const tokens = getStoredTokens()
  return tokens !== null && !isTokenExpired(tokens)
}
