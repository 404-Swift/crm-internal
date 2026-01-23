import { googleSheetsClient } from './client'
import type { Contact, ContactFormInput } from '@/types/contact'
import { toast } from '@/components/ui/toaster'
import { isConnected } from './oauth'

const SHEET_NAME = 'Contacts'

// Map contact data to Google Sheets row format
function contactToRow(contact: Contact | (ContactFormInput & { id: string; user_id: string; created_at: string; updated_at: string })): string[] {
  return [
    contact.id,
    contact.email,
    contact.first_name,
    contact.last_name,
    contact.company || '',
    contact.phone || '',
    contact.source || '',
    contact.status || '',
    contact.created_at,
    contact.updated_at,
    contact.user_id,
  ]
}

// Header row for Contacts sheet
const CONTACTS_HEADERS = [
  'ID',
  'Email',
  'First Name',
  'Last Name',
  'Company',
  'Phone',
  'Source',
  'Status',
  'Created At',
  'Updated At',
  'User ID',
]

export const googleSheetsContactsService = {
  async create(contact: Contact, silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!isConnected()) {
      return // Silent fail if not authenticated
    }

    try {
      // Check if contact already exists in Sheets (by ID)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, contact.id)
      if (rowIndex) {
        // Update existing row instead of appending
        const row = contactToRow(contact)
        await googleSheetsClient.updateRow(SHEET_NAME, rowIndex, row)
        return
      }

      // Append new row
      const row = contactToRow(contact)
      await googleSheetsClient.appendRow(SHEET_NAME, row)
    } catch (error) {
      console.error('Failed to write contact to Google Sheets:', error)
      // Only show toast for non-auth errors and if not in silent mode
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!silent && !errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.toLowerCase().includes('unauthorized')) {
        toast.error(
          'Google Sheets sync failed',
          'Contact saved to database, but failed to sync to Google Sheets.'
        )
      }
      // Don't throw - allow Supabase write to succeed
    }
  },

  async update(contact: Contact, silent: boolean = true): Promise<void> {
    if (!googleSheetsClient) {
      return // Silent fail if not configured
    }

    // Check if connected before attempting
    if (!isConnected()) {
      return // Silent fail if not authenticated
    }

    try {
      // Find the row by ID (column 0)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, contact.id)
      
      if (rowIndex) {
        const row = contactToRow(contact)
        await googleSheetsClient.updateRow(SHEET_NAME, rowIndex, row)
      } else {
        // If not found, append as new row
        await this.create(contact, silent)
      }
    } catch (error) {
      console.error('Failed to update contact in Google Sheets:', error)
      // Only show toast for non-auth errors and if not in silent mode
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!silent && !errorMessage.includes('401') && !errorMessage.includes('403') && !errorMessage.toLowerCase().includes('unauthorized')) {
        toast.error(
          'Google Sheets sync failed',
          'Contact updated in database, but failed to sync to Google Sheets.'
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
    if (!isConnected()) {
      return // Silent fail if not authenticated
    }

    try {
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, id)
      if (rowIndex) {
        // Mark as deleted by updating status (we can't actually delete rows without OAuth2)
        // Or you could implement a "Deleted" column
        console.warn('Row deletion in Google Sheets requires OAuth2. Row marked for manual deletion.')
      }
    } catch (error) {
      console.error('Failed to delete contact in Google Sheets:', error)
      // Don't throw - allow Supabase delete to succeed
    }
  },

  async ensureHeaders(): Promise<void> {
    if (!googleSheetsClient) return

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME, `${SHEET_NAME}!A1:Z1`)
      if (rows.length === 0 || rows[0].length === 0) {
        // Headers don't exist, create them
        await googleSheetsClient.appendRow(SHEET_NAME, CONTACTS_HEADERS)
      }
    } catch (error) {
      console.error('Failed to ensure headers in Google Sheets:', error)
    }
  },
}
