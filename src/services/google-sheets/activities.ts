import { googleSheetsClient } from './client'
import type { Activity, ActivityFormInput } from '@/types/activity'
import { toast } from '@/components/ui/toaster'

const SHEET_NAME = 'Activities'

// Map activity data to Google Sheets row format
function activityToRow(activity: Activity | (ActivityFormInput & { id: string; user_id: string; created_at: string })): string[] {
  return [
    activity.id,
    activity.type,
    activity.contact_id || '',
    activity.deal_id || '',
    activity.description,
    activity.created_at,
    activity.user_id,
  ]
}

// Header row for Activities sheet
const ACTIVITIES_HEADERS = [
  'ID',
  'Type',
  'Contact ID',
  'Deal ID',
  'Description',
  'Created At',
  'User ID',
]

export const googleSheetsActivitiesService = {
  async create(activity: Activity): Promise<void> {
    if (!googleSheetsClient) {
      console.warn('Google Sheets client not configured')
      return
    }

    try {
      // Check if activity already exists in Sheets (by ID)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, activity.id)
      if (rowIndex) {
        // Activity already exists, skip (activities are typically append-only)
        return
      }

      // Append new row
      const row = activityToRow(activity)
      await googleSheetsClient.appendRow(SHEET_NAME, row)
    } catch (error) {
      console.error('Failed to write activity to Google Sheets:', error)
      // Only show toast for non-auth errors (401/403 are expected when OAuth2 not set up)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('401') && !errorMessage.includes('403')) {
        toast.error(
          'Google Sheets sync failed',
          'Activity saved to database, but failed to sync to Google Sheets. Please check your configuration.'
        )
      }
      // Don't throw - allow Supabase write to succeed
    }
  },

  async delete(id: string): Promise<void> {
    if (!googleSheetsClient) {
      console.warn('Google Sheets client not configured')
      return
    }

    try {
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, id)
      if (rowIndex) {
        console.warn('Row deletion in Google Sheets requires OAuth2. Row marked for manual deletion.')
      }
    } catch (error) {
      console.error('Failed to delete activity in Google Sheets:', error)
      // Don't throw - allow Supabase delete to succeed
    }
  },

  async ensureHeaders(): Promise<void> {
    if (!googleSheetsClient) return

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME, `${SHEET_NAME}!A1:Z1`)
      if (rows.length === 0 || rows[0].length === 0) {
        // Headers don't exist, create them
        await googleSheetsClient.appendRow(SHEET_NAME, ACTIVITIES_HEADERS)
      }
    } catch (error) {
      console.error('Failed to ensure headers in Google Sheets:', error)
    }
  },
}
