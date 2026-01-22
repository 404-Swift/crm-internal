import { googleSheetsClient } from './client'
import type { Contact, ContactFormInput } from '@/types/contact'
import { toast } from '@/components/ui/toaster'

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
  async create(contact: Contact): Promise<void> {
    if (!googleSheetsClient) {
      console.warn('Google Sheets client not configured')
      return
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
      // Only show toast for non-auth errors (401/403 are expected when OAuth2 not set up)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('401') && !errorMessage.includes('403')) {
        toast.error(
          'Google Sheets sync failed',
          'Contact saved to database, but failed to sync to Google Sheets. Please check your configuration.'
        )
      }
      // Don't throw - allow Supabase write to succeed
    }
  },

  async update(contact: Contact): Promise<void> {
    if (!googleSheetsClient) {
      console.warn('Google Sheets client not configured')
      return
    }

    try {
      // Find the row by ID (column 0)
      const rowIndex = await googleSheetsClient.findRow(SHEET_NAME, 0, contact.id)
      
      if (rowIndex) {
        const row = contactToRow(contact)
        await googleSheetsClient.updateRow(SHEET_NAME, rowIndex, row)
      } else {
        // If not found, append as new row
        await this.create(contact)
      }
    } catch (error) {
      console.error('Failed to update contact in Google Sheets:', error)
      toast.error(
        'Google Sheets sync failed',
        'Contact updated in database, but failed to sync to Google Sheets.'
      )
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
