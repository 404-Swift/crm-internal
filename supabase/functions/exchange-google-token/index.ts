import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface RequestBody {
  code?: string
  refresh_token?: string
  redirect_uri: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get environment variables
    const clientId = Deno.env.get('GOOGLE_SHEETS_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_SHEETS_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: { message: 'Google OAuth credentials not configured' } }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Parse request body
    const body: RequestBody = await req.json()
    const { code, refresh_token, redirect_uri } = body

    if (!redirect_uri) {
      return new Response(
        JSON.stringify({ error: { message: 'redirect_uri is required' } }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Prepare token exchange request
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirect_uri,
    })

    if (code) {
      // Exchange authorization code for tokens
      tokenParams.append('code', code)
      tokenParams.append('grant_type', 'authorization_code')
    } else if (refresh_token) {
      // Refresh access token
      tokenParams.append('refresh_token', refresh_token)
      tokenParams.append('grant_type', 'refresh_token')
    } else {
      return new Response(
        JSON.stringify({ error: { message: 'Either code or refresh_token is required' } }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Exchange code/refresh token with Google
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json().catch(() => ({
        error: { message: tokenResponse.statusText },
      }))
      return new Response(JSON.stringify(error), {
        status: tokenResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const tokenData = await tokenResponse.json()

    // Return tokens to frontend
    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || refresh_token, // Use existing refresh token if not provided
        expires_in: tokenData.expires_in || 3600, // Default to 1 hour
        token_type: tokenData.token_type || 'Bearer',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in exchange-google-token:', error)
    return new Response(
      JSON.stringify({
        error: {
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
