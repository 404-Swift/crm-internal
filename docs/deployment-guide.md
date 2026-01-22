# Deployment Guide for crm.404swift.com

This guide walks you through deploying the CRM to Vercel and setting up Google OAuth for Google Sheets integration.

## Prerequisites

- Vercel account (sign up at [vercel.com](https://vercel.com))
- Domain access to 404swift.com DNS settings
- Google Cloud Console access
- Supabase project with Edge Functions enabled

## Part 1: Vercel Deployment

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Initialize and Deploy

From the project root:

```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? Select your account
- Link to existing project? **No** (for first deployment)
- Project name: **custom-crm** (or your preferred name)
- Directory: **./** (current directory)
- Override settings? **No**

### Step 4: Configure Custom Domain

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Domains**
4. Add domain: `crm.404swift.com`
5. Vercel will provide DNS configuration instructions

### Step 5: Configure DNS

1. Go to your domain registrar (where 404swift.com is registered)
2. Add a **CNAME** record:
   - **Name/Host**: `crm`
   - **Value/Target**: The CNAME value provided by Vercel (e.g., `cname.vercel-dns.com`)
   - **TTL**: 3600 (or default)

3. Wait for DNS propagation (usually 5-60 minutes, can take up to 48 hours)

4. Verify in Vercel dashboard that the domain is configured (green checkmark)

### Step 6: Set Environment Variables in Vercel

1. In Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add the following variables for **Production**, **Preview**, and **Development**:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_SHEETS_ID=your_google_sheets_id
VITE_GOOGLE_SHEETS_API_KEY=your_google_sheets_api_key
VITE_GOOGLE_SHEETS_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_SHEETS_REDIRECT_URI=https://crm.404swift.com/auth/google/callback
VITE_SUPABASE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1
```

**Note:** Replace `your-project-ref` with your actual Supabase project reference.

3. After adding variables, **redeploy** the project (Vercel → Deployments → ... → Redeploy)

## Part 2: Google Cloud Console OAuth Setup

### Step 1: Create/Select Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select an existing project or create a new one
3. Name it something like "404 Swift CRM"

### Step 2: Enable APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API** (required for some operations)

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **User Type**:
   - **External** (for public use)
   - **Internal** (if using Google Workspace)
3. Fill in the required information:
   - **App name**: `404 Swift CRM`
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click **Save and Continue**
5. **Scopes**: Click **Add or Remove Scopes**
   - Add: `https://www.googleapis.com/auth/spreadsheets`
   - Click **Update** → **Save and Continue**
6. **Test users** (if app is in Testing mode):
   - Add test users who will use the app
   - Click **Save and Continue**
7. **Summary**: Review and click **Back to Dashboard**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. **Application type**: **Web application**
4. **Name**: `404 Swift CRM Web Client`
5. **Authorized JavaScript origins**:
   - `https://crm.404swift.com`
   - `http://localhost:5173` (for development)
6. **Authorized redirect URIs**:
   - `https://crm.404swift.com/auth/google/callback`
   - `http://localhost:5173/auth/google/callback` (for development)
7. Click **Create**
8. **IMPORTANT**: Copy the **Client ID** and **Client Secret**
   - Client ID: Add to Vercel environment variables as `VITE_GOOGLE_SHEETS_CLIENT_ID`
   - Client Secret: Keep secure, will be used in Supabase Edge Function

## Part 3: Supabase Edge Function Setup

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

Find your project ref in your Supabase project URL: `https://your-project-ref.supabase.co`

### Step 4: Deploy Edge Function

```bash
cd supabase/functions/exchange-google-token
supabase functions deploy exchange-google-token
```

Or from project root:

```bash
supabase functions deploy exchange-google-token --project-ref your-project-ref
```

### Step 5: Set Edge Function Secrets

Set the Google OAuth credentials as secrets (these are secure and not exposed to the client):

```bash
supabase secrets set GOOGLE_SHEETS_CLIENT_ID=your_client_id --project-ref your-project-ref
supabase secrets set GOOGLE_SHEETS_CLIENT_SECRET=your_client_secret --project-ref your-project-ref
```

**Note:** Replace `your-project-ref` with your actual Supabase project reference.

### Step 6: Verify Function URL

Your function will be available at:
```
https://your-project-ref.supabase.co/functions/v1/exchange-google-token
```

Use this URL (without `/exchange-google-token`) as `VITE_SUPABASE_FUNCTIONS_URL` in Vercel environment variables.

## Part 4: Testing

### Step 1: Test OAuth Flow

1. Visit `https://crm.404swift.com/settings`
2. Click **Connect Google Sheets**
3. You should be redirected to Google OAuth consent screen
4. Grant permissions
5. You should be redirected back to the settings page with a success message

### Step 2: Verify Google Sheets Writes

1. Create a new contact or deal in the CRM
2. Check your Google Sheet to verify the data was written
3. Check browser console for any errors

### Step 3: Test Token Refresh

1. Wait for token to expire (or manually expire it in localStorage)
2. Try to create/update a contact
3. The system should automatically refresh the token

## Troubleshooting

### DNS Not Resolving

- Wait longer for DNS propagation (can take up to 48 hours)
- Check DNS records are correct in your registrar
- Use `dig crm.404swift.com` or `nslookup crm.404swift.com` to verify

### OAuth Redirect URI Mismatch

- Ensure redirect URIs in Google Console exactly match:
  - `https://crm.404swift.com/auth/google/callback`
  - `http://localhost:5173/auth/google/callback` (for dev)
- Check for trailing slashes or protocol mismatches

### Edge Function Not Working

- Verify function is deployed: `supabase functions list`
- Check function logs: `supabase functions logs exchange-google-token`
- Verify secrets are set: `supabase secrets list`
- Check CORS headers in function code

### Environment Variables Not Loading

- Redeploy after adding environment variables in Vercel
- Check variable names match exactly (case-sensitive)
- Verify variables are set for the correct environment (Production/Preview/Development)

### Token Refresh Failing

- Check browser console for errors
- Verify refresh token is stored in localStorage
- Check Supabase Edge Function logs
- Ensure Google OAuth credentials are correct

## Security Checklist

- [ ] Client secret is stored in Supabase Edge Function secrets (not in Vite env vars)
- [ ] HTTPS is enabled for production domain
- [ ] OAuth redirect URIs are correctly configured
- [ ] Environment variables are set in Vercel (not committed to git)
- [ ] DNS is properly configured
- [ ] Supabase Edge Function is deployed and accessible
- [ ] Google OAuth consent screen is configured
- [ ] Test users are added (if app is in Testing mode)

## Next Steps

After successful deployment:

1. Monitor Vercel deployment logs for any issues
2. Set up monitoring/analytics if desired
3. Configure custom error pages if needed
4. Set up automated deployments from Git (Vercel → Settings → Git)
5. Consider setting up staging environment with preview deployments

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Check Supabase Edge Function logs
3. Check browser console for client-side errors
4. Verify all environment variables are set correctly
5. Review this guide for any missed steps
