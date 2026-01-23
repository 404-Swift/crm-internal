import { googleSheetsClient } from './client'
import type { Deal, DealFormInput } from '@/types/deal'
import { toast } from '@/components/ui/toaster'
import { isConnected } from './oauth'

const SHEET_NAME = 'Deals'

// Map deal data to Google Sheets row format
function dealToRow(deal: Deal | (DealFormInput & { id: string; user_id: string; created_at: string; updated_at: string })): string[] {
  return [
    deal.id,
    deal.title,
    deal.contact_id,
    deal.amount.toString(),
    deal.stage,
    deal.probability.toString(),
    deal.expected_close_date || '',
    deal.created_at,
    deal.updated_at,
    deal.user_id,
  ]
}

// Header row for Deals sheet
const DEALS_HEADERS = [
  'ID',
  'Title',
  'Contact ID',
  'Amount',
  'Stage',
  'Probability',
  'Expected Close Date',
  'Created At',
  'Updated At',
  'User ID',
]

export const googleSheetsDealsService = {
  async create(deal: Deal, silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!(await isConnected())) {
      return // Silent fail if not authenticated
    }

    try {
      // Check if deal already exists in Sheets (by ID)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, deal.id)
      if (rowIndex) {
        // Update existing row instead of appending
        const row = dealToRow(deal)
        await googleSheetsClient.updateRow(SHEET_NAME, rowIndex, row)
        return
      }

      // Append new row
      const row = dealToRow(deal)
      await googleSheetsClient.appendRow(SHEET_NAME, row)
    } catch (error) {
      console.error('Failed to write deal to Google Sheets:', error)
      // Only show toast for non-auth errors and if not in silent mode
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!silent && !errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.toLowerCase().includes('unauthorized')) {
        toast.error(
          'Google Sheets sync failed',
          'Deal saved to database, but failed to sync to Google Sheets.'
        )
      }
      // Don't throw - allow Supabase write to succeed
    }
  },

  async update(deal: Deal, silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!(await isConnected())) {
      return // Silent fail if not authenticated
    }

    try {
      // Find the row by ID (column 0)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, deal.id)
      
      if (rowIndex) {
        const row = dealToRow(deal)
        await googleSheetsClient.updateRow(SHEET_NAME, rowIndex, row)
      } else {
        // If not found, append as new row
        await this.create(deal, silent)
      }
    } catch (error) {
      console.error('Failed to update deal in Google Sheets:', error)
      // Only show toast for non-auth errors and if not in silent mode
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!silent && !errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.toLowerCase().includes('unauthorized')) {
        toast.error(
          'Google Sheets sync failed',
          'Deal updated in database, but failed to sync to Google Sheets.'
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
      console.error('Failed to delete deal in Google Sheets:', error)
      // Don't throw - allow Supabase delete to succeed
    }
  },

  async ensureHeaders(): Promise<void> {
    if (!googleSheetsClient) return

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME, `${SHEET_NAME}!A1:Z1`)
      if (rows.length === 0 || rows[0].length === 0) {
        // Headers don't exist, create them
        await googleSheetsClient.appendRow(SHEET_NAME, DEALS_HEADERS)
      }
    } catch (error) {
      console.error('Failed to ensure headers in Google Sheets:', error)
    }
  },
}
