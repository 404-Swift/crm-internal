# Google Sheets Direct Integration

This document describes the direct Google Sheets integration for dual-write architecture.

## Architecture

The application uses a **dual-write** pattern:
1. **Supabase** - Fast writes for immediate UI updates
2. **Google Sheets** - Source of truth, written in background

### Data Flow

```
User Action (Create/Update/Delete)
    ↓
Write to Supabase (immediate, fast)
    ↓
UI Updates (instant feedback)
    ↓
Background: Write to Google Sheets (async, source of truth)
```

## Setup

### 1. Get Google Sheets ID

Extract from your Google Sheets URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```

### 2. Get Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable **Google Sheets API**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy the API key

**Note:** API keys work for read operations, but **write operations require OAuth2**.

### 3. Set Up OAuth2 for Write Operations

For write operations (create, update, delete), you need OAuth2:

#### Option A: OAuth2 (Recommended)

1. In Google Cloud Console, go to **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Add authorized redirect URIs (your app URL)
5. Download credentials or note Client ID and Client Secret

#### Option B: Service Account (For Server-Side)

1. Create a **Service Account** in Google Cloud Console
2. Download the JSON key file
3. Share your Google Sheet with the service account email
4. Use the JSON file for authentication

### 4. Environment Variables

Add to your `.env.local`:

```env
VITE_GOOGLE_SHEETS_ID=your_sheet_id
VITE_GOOGLE_SHEETS_API_KEY=your_api_key
VITE_GOOGLE_SHEETS_ACCESS_TOKEN=your_oauth2_token  # For writes
```

## How It Works

### Write Operations

When a user creates, updates, or deletes data:

1. **Immediate Write to Supabase**
   - Fast database write
   - UI updates instantly
   - User sees immediate feedback

2. **Background Write to Google Sheets**
   - Async operation (doesn't block UI)
   - If it fails, user is notified but operation still succeeds
   - Google Sheets remains source of truth

### Error Handling

- If Google Sheets write fails, the operation still succeeds in Supabase
- User sees a toast notification about the sync failure
- Errors are logged to console
- Data remains consistent in Supabase

### Read Operations

- All reads come from Supabase (fast, cached)
- Google Sheets is only written to, not read from
- This ensures fast UI performance

## Authentication Methods

### API Key (Read-Only)

- Works for reading data
- Limited permissions
- Good for read operations

### OAuth2 (Read/Write)

- Required for write operations
- More secure
- User grants permissions
- Access tokens expire (need refresh)

### Service Account (Server-Side)

- Best for automated workflows
- No user interaction needed
- Share sheet with service account email
- Use JSON key file for authentication

## Implementation Details

### Services

- `services/google-sheets/client.ts` - Google Sheets API client
- `services/google-sheets/contacts.ts` - Contact sync service
- `services/google-sheets/deals.ts` - Deal sync service
- `services/google-sheets/activities.ts` - Activity sync service

### Dual Write Pattern

All Supabase services now include background Google Sheets writes:

```typescript
// Example: Create contact
async create(input, userId) {
  // 1. Write to Supabase (fast)
  const contact = await supabase.insert(...)
  
  // 2. Write to Google Sheets (background, async)
  googleSheetsContactsService.create(contact).catch(err => {
    // Handle error gracefully
  })
  
  return contact
}
```

## Troubleshooting

### "Google Sheets client not configured"

- Check that `VITE_GOOGLE_SHEETS_ID` is set
- Verify environment variables are loaded

### "Failed to write to Google Sheets"

- Check OAuth2 token is valid (if using OAuth2)
- Verify API key has correct permissions (if using API key)
- Check Google Sheets API is enabled
- Verify sheet is shared with service account (if using Service Account)

### Write Operations Fail

- **API Key alone won't work for writes** - You need OAuth2 or Service Account
- Set up OAuth2 flow or use Service Account
- Ensure access token is valid and not expired

### Headers Not Created

- First write operation will create headers automatically
- If headers exist, they won't be overwritten
- Check sheet permissions

## Best Practices

1. **Always write to Supabase first** - Ensures fast UI
2. **Google Sheets writes are async** - Don't block on them
3. **Handle errors gracefully** - Don't fail the operation if Sheets write fails
4. **Use OAuth2 for production** - More secure than API keys
5. **Monitor sync failures** - Log errors and notify users
6. **Keep Supabase as cache** - Fast reads from Supabase, Sheets as source of truth

## Syncing Existing Data

If you've been using the CRM before setting up Google Sheets OAuth2, you can sync all existing data from Supabase to Google Sheets:

1. **Set up OAuth2** (see Setup section above)
2. **Go to Settings page** in the CRM
3. **Click "Sync All Data to Google Sheets"**
4. The system will:
   - Ensure headers exist in all sheets
   - Sync all contacts, deals, and activities
   - Show a summary of synced/failed records

### How Sync Works

- **Checks for duplicates**: Before appending, checks if a record already exists (by ID)
- **Updates existing**: If a record exists, updates it instead of creating a duplicate
- **Graceful failures**: If a record fails to sync, it continues with the rest
- **Progress feedback**: Shows toast notifications with sync results

### Manual Sync

You can also sync individual records:
- Use the sync functions in `services/google-sheets/sync.ts`
- Or trigger sync from the Settings page

## Future Enhancements

- Retry logic for failed Google Sheets writes
- Queue system for background writes
- Sync status indicator in UI
- Conflict resolution (if Sheets is edited directly)
- Scheduled automatic sync
