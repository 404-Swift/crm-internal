import { getAccessToken } from './oauth'

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

interface GoogleSheetsConfig {
  spreadsheetId: string
  apiKey?: string
  accessToken?: string // Legacy support - will be ignored if OAuth tokens are available
}

class GoogleSheetsClient {
  private spreadsheetId: string
  private apiKey?: string
  private legacyAccessToken?: string // Keep for backward compatibility

  constructor(config: GoogleSheetsConfig) {
    this.spreadsheetId = config.spreadsheetId
    this.apiKey = config.apiKey
    this.legacyAccessToken = config.accessToken
  }

  /**
   * Get access token from OAuth storage or fallback to legacy token
   */
  private async getAccessToken(): Promise<string | null> {
    // Try to get OAuth token first
    try {
      const oauthToken = await getAccessToken()
      if (oauthToken) {
        return oauthToken
      }
    } catch (error) {
      console.warn('Failed to get OAuth token:', error)
    }

    // Fallback to legacy access token if available
    if (
      this.legacyAccessToken &&
      this.legacyAccessToken !== 'your_oauth2_access_token' &&
      this.legacyAccessToken.length > 20
    ) {
      return this.legacyAccessToken
    }

    return null
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuthError = true
  ): Promise<Response> {
    const url = new URL(`${GOOGLE_SHEETS_API_BASE}/${endpoint}`)
    
    // Determine if this is a read or write operation
    const isReadOperation = !options.method || options.method === 'GET'
    const isWriteOperation = options.method === 'POST' || options.method === 'PUT' || options.method === 'DELETE'
    
    // For write operations, always try to use OAuth token
    // For read operations, prefer API key if available
    let accessToken: string | null = null
    
    // Prepare headers as a Record to allow dynamic assignment
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Merge existing headers if they're a plain object
    if (options.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value
        })
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value
        })
      } else {
        Object.assign(headers, options.headers)
      }
    }

    if (isWriteOperation) {
      // Write operations require OAuth token
      accessToken = await this.getAccessToken()
      if (accessToken) {
        // Use Authorization header for OAuth tokens (recommended)
        headers['Authorization'] = `Bearer ${accessToken}`
      } else {
        throw new Error('Write operations require OAuth2 authentication. Please connect Google Sheets in Settings.')
      }
    } else if (isReadOperation) {
      // Read operations: prefer OAuth token if available (has proper permissions), fallback to API key
      accessToken = await this.getAccessToken()
      if (accessToken) {
        // Use Authorization header for OAuth tokens (recommended)
        headers['Authorization'] = `Bearer ${accessToken}`
      } else if (this.apiKey) {
        // Fallback to API key if OAuth not available
        url.searchParams.set('key', this.apiKey)
      } else {
        throw new Error('Google Sheets API requires either an API key or OAuth2 access token')
      }
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    })

    // Handle 401/403 Unauthorized/Forbidden - token might be expired or API key doesn't have permission
    if ((response.status === 401 || response.status === 403) && retryOnAuthError) {
      // If we used API key and got 403, try OAuth token instead
      if (response.status === 403 && !accessToken && this.apiKey) {
        const oauthToken = await this.getAccessToken()
        if (oauthToken) {
          // Retry with OAuth token using Authorization header
          url.searchParams.delete('key')
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${oauthToken}`,
          }
          
          // Merge existing headers
          if (options.headers) {
            if (options.headers instanceof Headers) {
              options.headers.forEach((value, key) => {
                retryHeaders[key] = value
              })
            } else if (Array.isArray(options.headers)) {
              options.headers.forEach(([key, value]) => {
                retryHeaders[key] = value
              })
            } else {
              Object.assign(retryHeaders, options.headers)
            }
          }
          return fetch(url.toString(), {
            ...options,
            headers: retryHeaders,
          }).then(async (retryResponse) => {
            if (!retryResponse.ok) {
              const error = await retryResponse.json().catch(() => ({ error: { message: retryResponse.statusText } }))
              throw new Error(error.error?.message || `Google Sheets API error: ${retryResponse.statusText}`)
            }
            return retryResponse
          })
        }
      }
      
      // Try refreshing token and retry once
      if (accessToken) {
        try {
          const { refreshToken } = await import('./oauth')
          await refreshToken()
          // Retry the request with new token
          return this.request(endpoint, options, false) // Don't retry again
        } catch (refreshError) {
          console.error('Failed to refresh token:', refreshError)
          // Fall through to error handling
        }
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(error.error?.message || `Google Sheets API error: ${response.statusText}`)
    }

    return response
  }

  async appendRow(sheetName: string, values: string[]): Promise<void> {
    const endpoint = `${this.spreadsheetId}/values/${sheetName}:append`
    
    await this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        values: [values],
        valueInputOption: 'USER_ENTERED',
      }),
    })
  }

  async updateRow(sheetName: string, rowIndex: number, values: string[]): Promise<void> {
    const range = `${sheetName}!A${rowIndex}:${String.fromCharCode(65 + values.length - 1)}${rowIndex}`
    const endpoint = `${this.spreadsheetId}/values/${range}`
    
    await this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({
        values: [values],
        valueInputOption: 'USER_ENTERED',
      }),
    })
  }

  async findRow(sheetName: string, columnIndex: number, searchValue: string): Promise<number | null> {
    const range = `${sheetName}!A:Z`
    const endpoint = `${this.spreadsheetId}/values/${range}`
    
    const response = await this.request(endpoint)
    const data = await response.json()
    const rows = data.values || []

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][columnIndex] === searchValue) {
        return i + 1 // Return 1-based row index
      }
    }

    return null
  }

  async getRows(sheetName: string, range?: string): Promise<string[][]> {
    const sheetRange = range || `${sheetName}!A:Z`
    const endpoint = `${this.spreadsheetId}/values/${sheetRange}`
    
    const response = await this.request(endpoint)
    const data = await response.json()
    return data.values || []
  }

  async deleteRow(_sheetName: string, _rowIndex: number): Promise<void> {
    // Note: Deleting rows requires batchUpdate, which needs OAuth2
    // For now, we'll mark rows as deleted by updating a status column
    // Full delete requires OAuth2 authentication
    throw new Error('Row deletion requires OAuth2 authentication. Use updateRow to mark as deleted instead.')
  }
}

// Initialize client with environment variables
const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID
const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY
const accessTokenEnv = import.meta.env.VITE_GOOGLE_SHEETS_ACCESS_TOKEN

// Only use access token if it's a real token (not placeholder)
const accessToken = accessTokenEnv && 
  accessTokenEnv !== 'your_oauth2_access_token' && 
  accessTokenEnv.length > 20
  ? accessTokenEnv
  : undefined

export const googleSheetsClient = spreadsheetId
  ? new GoogleSheetsClient({
      spreadsheetId,
      apiKey,
      accessToken,
    })
  : null

export { GoogleSheetsClient }
