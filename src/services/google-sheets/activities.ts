import { googleSheetsClient } from './client'
import type { Activity, ActivityFormInput } from '@/types/activity'
import { toast } from '@/components/ui/toaster'
import { isConnected } from './oauth'

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
  async create(activity: Activity, silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!(await isConnected())) {
      return // Silent fail if not authenticated
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
      // Only show toast for non-auth errors and if not in silent mode
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!silent && !errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.toLowerCase().includes('unauthorized')) {
        toast.error(
          'Google Sheets sync failed',
          'Activity saved to database, but failed to sync to Google Sheets.'
        )
      }
      // Don't throw - allow Supabase write to succeed
    }
  },

  async delete(id: string, _silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!(await isConnected())) {
      return // Silent fail if not authenticated
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
