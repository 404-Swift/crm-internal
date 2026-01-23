import { getEvents, type GoogleCalendarEvent } from './client'
import { bookingsService } from '../supabase/bookings'
import { parseISO, compareAsc } from 'date-fns'

/**
 * Convert Google Calendar event to booking format
 */
function googleEventToBooking(
  event: GoogleCalendarEvent
): {
  google_calendar_event_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  google_calendar_synced_at: string
} {
  // Handle all-day events (date field) vs timed events (dateTime field)
  const startTime = event.start.dateTime || event.start.date
  const endTime = event.end.dateTime || event.end.date

  if (!startTime || !endTime) {
    throw new Error(`Event ${event.id} is missing start or end time`)
  }

  // For all-day events, ensure we have proper timestamps
  let startTimestamp: string
  let endTimestamp: string

  if (event.start.date) {
    // All-day event - use start of day and end of day
    startTimestamp = new Date(startTime).toISOString()
    // End date for all-day events is exclusive, so subtract 1 day
    const endDate = new Date(endTime)
    endDate.setDate(endDate.getDate() - 1)
    endTimestamp = new Date(endDate.setHours(23, 59, 59, 999)).toISOString()
  } else {
    startTimestamp = startTime
    endTimestamp = endTime
  }

  return {
    google_calendar_event_id: event.id,
    title: event.summary || 'Untitled Event',
    description: event.description || undefined,
    start_time: startTimestamp,
    end_time: endTimestamp,
    location: event.location || undefined,
    google_calendar_synced_at: new Date().toISOString(),
  }
}

/**
 * Sync bookings from Google Calendar to Supabase
 */
export async function syncBookingsFromGoogleCalendar(
  userId: string,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string
): Promise<{ synced: number; errors: number }> {
  let synced = 0
  let errors = 0
  let nextPageToken: string | undefined
  let syncToken: string | undefined

  // Try to get stored sync token from localStorage
  const storedSyncToken = localStorage.getItem('google_calendar_sync_token')
  if (storedSyncToken && !timeMin && !timeMax) {
    syncToken = storedSyncToken
  }

  // If no sync token and no time range, default to last 30 days and next 90 days
  if (!syncToken && !timeMin && !timeMax) {
    const now = new Date()
    timeMin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
  }

  do {
    try {
      const response = await getEvents(calendarId, timeMin, timeMax, 2500, syncToken)
      
      // Process each event
      for (const event of response.items) {
        try {
          // Skip recurring event instances (we only want the master event)
          if (event.recurringEventId) {
            continue
          }

          // Check if booking already exists in Supabase by Google Calendar event ID
          const existingBooking = await bookingsService.getByGoogleCalendarEventId(
            event.id,
            userId
          ).catch(() => null)

          // Get event updated time from Google Calendar (if available)
          // Note: Google Calendar API doesn't always return 'updated' field in list view
          // We'll use current time as fallback, but prefer to fetch full event if needed
          const calendarUpdated = event.updated ? parseISO(event.updated) : new Date()
          
          // Conflict resolution: Compare updated_at timestamps
          if (existingBooking) {
            const supabaseUpdated = parseISO(existingBooking.updated_at)
            
            // If Google Calendar was updated more recently, update from Calendar
            if (compareAsc(calendarUpdated, supabaseUpdated) > 0) {
              const bookingData = googleEventToBooking(event)
              await bookingsService.upsertFromGoogleCalendar(
                event.id,
                bookingData,
                userId
              )
              synced++
            } else {
              // Supabase is more recent, skip this event (CRM is source of truth)
              // The booking will be synced to Calendar on next update
              continue
            }
          } else {
            // New event, create booking
            const bookingData = googleEventToBooking(event)
            await bookingsService.upsertFromGoogleCalendar(
              event.id,
              bookingData,
              userId
            )
            synced++
          }
        } catch (error) {
          console.error(`Failed to sync event ${event.id}:`, error)
          errors++
        }
      }

      // Store sync token for next incremental sync
      if (response.nextSyncToken) {
        syncToken = response.nextSyncToken
        localStorage.setItem('google_calendar_sync_token', response.nextSyncToken)
      }

      nextPageToken = response.nextPageToken
    } catch (error) {
      console.error('Failed to fetch events from Google Calendar:', error)
      // If sync token is invalid, clear it and retry without it
      if (syncToken && (error as any).message?.includes('syncToken')) {
        localStorage.removeItem('google_calendar_sync_token')
        syncToken = undefined
        continue
      }
      throw error
    }
  } while (nextPageToken)

  return { synced, errors }
}

/**
 * Get the last sync time
 */
export function getLastSyncTime(): Date | null {
  const lastSync = localStorage.getItem('google_calendar_last_sync')
  return lastSync ? new Date(lastSync) : null
}

/**
 * Set the last sync time
 */
export function setLastSyncTime(): void {
  localStorage.setItem('google_calendar_last_sync', new Date().toISOString())
}
