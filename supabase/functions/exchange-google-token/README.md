# Exchange Google Token Edge Function

This Supabase Edge Function securely exchanges Google OAuth authorization codes for access tokens, or refreshes expired access tokens.

## Environment Variables

Set these in your Supabase project settings (Dashboard → Project Settings → Edge Functions → Secrets):

- `GOOGLE_SHEETS_CLIENT_ID` - Your Google OAuth Client ID
- `GOOGLE_SHEETS_CLIENT_SECRET` - Your Google OAuth Client Secret

## Usage

### Exchange Authorization Code

```typescript
POST /functions/v1/exchange-google-token
Content-Type: application/json

{
  "code": "authorization_code_from_google",
  "redirect_uri": "https://crm.404swift.com/auth/google/callback"
}
```

### Refresh Access Token

```typescript
POST /functions/v1/exchange-google-token
Content-Type: application/json

{
  "refresh_token": "refresh_token_from_storage",
  "redirect_uri": "https://crm.404swift.com/auth/google/callback"
}
```

## Response

```json
{
  "access_token": "ya29.a0AfH6...",
  "refresh_token": "1//0g...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

## Deployment

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy exchange-google-token

# Set secrets
supabase secrets set GOOGLE_SHEETS_CLIENT_ID=your_client_id
supabase secrets set GOOGLE_SHEETS_CLIENT_SECRET=your_client_secret
```
