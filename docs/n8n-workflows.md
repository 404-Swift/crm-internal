# n8n Workflows Documentation

This document describes the n8n workflows required to synchronize data between Google Sheets (source of truth) and Supabase PostgreSQL.

## Overview

Since Google Sheets is the primary source of truth, the main workflow syncs data from Sheets to Supabase whenever changes occur in Sheets.

## Workflow 1: Google Sheets → Supabase Sync

**Purpose:** Sync data from Google Sheets to Supabase when rows are added, updated, or deleted.

### Trigger Options

#### Option A: Scheduled Trigger (Recommended for Production)
- **Node:** Schedule Trigger
- **Interval:** Every 5-15 minutes (adjust based on needs)
- **Description:** Polls Google Sheets for changes and syncs to Supabase

#### Option B: Webhook Trigger (Requires Google Apps Script)
- **Node:** Webhook
- **Description:** Receives webhook calls from Google Apps Script when Sheets change
- **Setup:** Requires setting up Google Apps Script to call the webhook URL

### Workflow Steps

1. **Google Sheets Node (Read)**
   - **Operation:** Read Rows
   - **Sheet:** Contacts / Deals / Activities
   - **Range:** A2:Z (or appropriate range)
   - **Output:** Array of row objects

2. **Transform Data Node (Function)**
   - **Type:** Code / Function
   - **Purpose:** Transform Google Sheets format to Supabase format
   - **Example for Contacts:**
     ```javascript
     const items = $input.all();
     return items.map(item => ({
       json: {
         id: item.json['ID'],
         email: item.json['Email'],
         first_name: item.json['First Name'],
         last_name: item.json['Last Name'],
         company: item.json['Company'] || null,
         phone: item.json['Phone'] || null,
         source: item.json['Source'] || null,
         status: item.json['Status'] || null,
         user_id: item.json['User ID'],
         created_at: item.json['Created At'] || new Date().toISOString(),
         updated_at: item.json['Updated At'] || new Date().toISOString(),
       }
     }));
     ```

3. **Supabase Node (Upsert)**
   - **Operation:** Upsert
   - **Table:** contacts / deals / activities
   - **Match Columns:** id (or email for contacts)
   - **Columns to Update:** All columns except id and created_at
   - **Description:** Upserts rows into Supabase (insert if new, update if exists)

4. **Error Handling Node**
   - **Type:** IF / Error Trigger
   - **Purpose:** Handle errors and send notifications
   - **Actions:** Log errors, send email/Slack notification if sync fails

### Workflow Configuration

Create separate workflows for each table:
- `sheets-to-supabase-contacts`
- `sheets-to-supabase-deals`
- `sheets-to-supabase-activities`

### Google Apps Script Setup (Optional, for Real-time Sync)

If using webhook triggers, add this Google Apps Script to your Sheets:

```javascript
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  
  // Only sync specific sheets
  const syncSheets = ['Contacts', 'Deals', 'Activities'];
  if (!syncSheets.includes(sheetName)) return;
  
  const row = e.range.getRow();
  if (row === 1) return; // Skip header row
  
  const n8nWebhookUrl = 'YOUR_N8N_WEBHOOK_URL';
  
  const payload = {
    sheet: sheetName,
    row: row,
    range: sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0],
  };
  
  UrlFetchApp.fetch(n8nWebhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
  });
}
```

## Workflow 2: Supabase → Google Sheets Backup (Optional)

**Purpose:** Backup Supabase data to Google Sheets (one-way sync from Supabase to Sheets).

### When to Use

- Periodic backups
- Export functionality
- Data archival

### Workflow Steps

1. **Supabase Node (Read)**
   - **Operation:** Select
   - **Table:** contacts / deals / activities
   - **Filter:** All rows (or filtered by date range)

2. **Transform Data Node**
   - Convert Supabase format to Google Sheets format

3. **Google Sheets Node (Write)**
   - **Operation:** Append or Update
   - **Sheet:** Backup sheet or append to main sheet

## n8n Setup Instructions

1. **Install n8n:**
   ```bash
   npm install -g n8n
   n8n start
   ```

2. **Configure Credentials:**
   - Google Sheets: OAuth2 or Service Account
   - Supabase: API Key and URL

3. **Import Workflows:**
   - Create workflows using the steps above
   - Test with sample data
   - Enable workflows

4. **Set Up Monitoring:**
   - Configure error notifications
   - Set up logging
   - Monitor sync frequency and success rate

## Best Practices

1. **Idempotency:** Use upsert operations to handle duplicate syncs
2. **Error Handling:** Always include error handling nodes
3. **Logging:** Log all sync operations for debugging
4. **Rate Limiting:** Be mindful of API rate limits for both Google Sheets and Supabase
5. **Data Validation:** Validate data before syncing to prevent errors
6. **Incremental Sync:** For large datasets, sync only changed rows using timestamps

## Troubleshooting

- **Sync not working:** Check credentials, verify webhook URLs, check n8n execution logs
- **Data mismatch:** Verify column mappings in transform nodes
- **Rate limit errors:** Reduce sync frequency or implement batching
- **Missing data:** Check RLS policies in Supabase, verify user_id matches

## Example n8n Workflow JSON

You can export workflows from n8n and share them as JSON files. Store them in:
- `docs/n8n-workflows/sheets-to-supabase-contacts.json`
- `docs/n8n-workflows/sheets-to-supabase-deals.json`
- `docs/n8n-workflows/sheets-to-supabase-activities.json`
