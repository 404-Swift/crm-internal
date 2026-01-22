import { googleSheetsClient } from './client'
import type { Contact } from '@/types/contact'
import type { Deal } from '@/types/deal'
import type { Activity } from '@/types/activity'

const SHEET_NAME_CONTACTS = 'Contacts'
const SHEET_NAME_DEALS = 'Deals'
const SHEET_NAME_ACTIVITIES = 'Activities'

// Parse Google Sheets row to Contact
function rowToContact(row: string[]): Contact | null {
  if (row.length < 11) return null
  
  return {
    id: row[0] || '',
    email: row[1] || '',
    first_name: row[2] || '',
    last_name: row[3] || '',
    company: row[4] || undefined,
    phone: row[5] || undefined,
    source: row[6] || undefined,
    status: row[7] || undefined,
    created_at: row[8] || new Date().toISOString(),
    updated_at: row[9] || new Date().toISOString(),
    user_id: row[10] || '',
  }
}

// Parse Google Sheets row to Deal
function rowToDeal(row: string[]): Deal | null {
  if (row.length < 10) return null
  
  return {
    id: row[0] || '',
    title: row[1] || '',
    contact_id: row[2] || '',
    amount: parseFloat(row[3]) || 0,
    stage: row[4] || '',
    probability: parseInt(row[5]) || 0,
    expected_close_date: row[6] || undefined,
    created_at: row[7] || new Date().toISOString(),
    updated_at: row[8] || new Date().toISOString(),
    user_id: row[9] || '',
  }
}

// Parse Google Sheets row to Activity
function rowToActivity(row: string[]): Activity | null {
  if (row.length < 7) return null
  
  return {
    id: row[0] || '',
    type: row[1] || '',
    contact_id: row[2] || undefined,
    deal_id: row[3] || undefined,
    description: row[4] || '',
    created_at: row[5] || new Date().toISOString(),
    user_id: row[6] || '',
  }
}

export const googleSheetsReadService = {
  async getAllContacts(): Promise<Contact[]> {
    if (!googleSheetsClient) {
      throw new Error('Google Sheets client not configured')
    }

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME_CONTACTS)
      // Skip header row (index 0)
      const dataRows = rows.slice(1)
      const contacts = dataRows
        .map(rowToContact)
        .filter((contact): contact is Contact => contact !== null)
      return contacts
    } catch (error) {
      console.error('Failed to read contacts from Google Sheets:', error)
      throw error
    }
  },

  async getAllDeals(): Promise<Deal[]> {
    if (!googleSheetsClient) {
      throw new Error('Google Sheets client not configured')
    }

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME_DEALS)
      // Skip header row (index 0)
      const dataRows = rows.slice(1)
      const deals = dataRows
        .map(rowToDeal)
        .filter((deal): deal is Deal => deal !== null)
      return deals
    } catch (error) {
      console.error('Failed to read deals from Google Sheets:', error)
      throw error
    }
  },

  async getAllActivities(): Promise<Activity[]> {
    if (!googleSheetsClient) {
      throw new Error('Google Sheets client not configured')
    }

    try {
      const rows = await googleSheetsClient.getRows(SHEET_NAME_ACTIVITIES)
      // Skip header row (index 0)
      const dataRows = rows.slice(1)
      const activities = dataRows
        .map(rowToActivity)
        .filter((activity): activity is Activity => activity !== null)
      return activities
    } catch (error) {
      console.error('Failed to read activities from Google Sheets:', error)
      throw error
    }
  },
}
