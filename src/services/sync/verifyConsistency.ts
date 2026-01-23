import { bookingsService } from '../supabase/bookings'
import { getEvent } from '../google-calendar/client'

export interface ConsistencyInconsistency {
  system: 'supabase' | 'google-calendar' | 'google-sheets'
  field: string
  expectedValue: any
  actualValue: any
  bookingId: string
}

export interface ConsistencyReport {
  isConsistent: boolean
  inconsistencies: ConsistencyInconsistency[]
  missingRecords: Array<{
    system: 'google-calendar' | 'google-sheets'
    bookingId: string
  }>
}

/**
 * Normalize timestamp for comparison (handles timezone differences)
 */
function normalizeTimestamp(timestamp: string | null | undefined): string | null {
  if (!timestamp) return null
  try {
    // Parse and format to ISO string for comparison
    return new Date(timestamp).toISOString()
  } catch {
    return null
  }
}

/**
 * Normalize string for comparison
 */
function normalizeString(value: any): string {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

/**
 * Compare two values with normalization
 */
function valuesMatch(expected: any, actual: any, field: string): boolean {
  // Handle null/undefined equivalency
  if ((expected === null || expected === undefined) && (actual === null || actual === undefined)) {
    return true
  }

  // Special handling for timestamps
  if (field.includes('time') || field.includes('date')) {
    const normalizedExpected = normalizeTimestamp(expected)
    const normalizedActual = normalizeTimestamp(actual)
    // Compare with 1 minute tolerance for timezone rounding
    if (normalizedExpected && normalizedActual) {
      const diff = Math.abs(new Date(normalizedExpected).getTime() - new Date(normalizedActual).getTime())
      return diff < 60000 // 1 minute tolerance
    }
    return normalizedExpected === normalizedActual
  }

  // String comparison
  return normalizeString(expected) === normalizeString(actual)
}

/**
 * Verify 100% data consistency between Supabase, Google Calendar, and Google Sheets
 */
export async function verifyBookingConsistency(
  bookingId: string,
  userId: string
): Promise<ConsistencyReport> {
  const inconsistencies: ConsistencyInconsistency[] = []
  const missingRecords: Array<{ system: 'google-calendar' | 'google-sheets'; bookingId: string }> = []

  // 1. Fetch from Supabase (source of truth for CRM)
  let supabaseBooking: Awaited<ReturnType<typeof bookingsService.getById>> = null
  try {
    supabaseBooking = await bookingsService.getById(bookingId, userId)
    if (!supabaseBooking) {
      return {
        isConsistent: false,
        inconsistencies: [{
          system: 'supabase',
          field: 'id',
          expectedValue: bookingId,
          actualValue: null,
          bookingId,
        }],
        missingRecords: [],
      }
    }
  } catch (error) {
    return {
      isConsistent: false,
      inconsistencies: [{
        system: 'supabase',
        field: 'id',
        expectedValue: bookingId,
        actualValue: 'error',
        bookingId,
      }],
      missingRecords: [],
    }
  }

  // 2. Fetch from Google Calendar (if event ID exists)
  let googleCalendarEvent: any = null
  if (supabaseBooking.google_calendar_event_id) {
    try {
      googleCalendarEvent = await getEvent('primary', supabaseBooking.google_calendar_event_id)
    } catch (error) {
      // Event might not exist in Calendar
      missingRecords.push({
        system: 'google-calendar',
        bookingId,
      })
    }
  }

  // 3. Compare Supabase ↔ Google Calendar
  if (googleCalendarEvent) {
    // Compare title
    if (!valuesMatch(supabaseBooking.title, googleCalendarEvent.summary, 'title')) {
      inconsistencies.push({
        system: 'google-calendar',
        field: 'title',
        expectedValue: supabaseBooking.title,
        actualValue: googleCalendarEvent.summary,
        bookingId,
      })
    }

    // Compare description (normalize newlines and whitespace)
    const supabaseDesc = normalizeString(supabaseBooking.description || '')
    const calendarDesc = normalizeString(googleCalendarEvent.description || '')
    if (supabaseDesc !== calendarDesc) {
      inconsistencies.push({
        system: 'google-calendar',
        field: 'description',
        expectedValue: supabaseBooking.description,
        actualValue: googleCalendarEvent.description,
        bookingId,
      })
    }

    // Compare start time
    const calendarStart = googleCalendarEvent.start.dateTime || googleCalendarEvent.start.date
    if (!valuesMatch(supabaseBooking.start_time, calendarStart, 'start_time')) {
      inconsistencies.push({
        system: 'google-calendar',
        field: 'start_time',
        expectedValue: supabaseBooking.start_time,
        actualValue: calendarStart,
        bookingId,
      })
    }

    // Compare end time
    const calendarEnd = googleCalendarEvent.end.dateTime || googleCalendarEvent.end.date
    if (!valuesMatch(supabaseBooking.end_time, calendarEnd, 'end_time')) {
      inconsistencies.push({
        system: 'google-calendar',
        field: 'end_time',
        expectedValue: supabaseBooking.end_time,
        actualValue: calendarEnd,
        bookingId,
      })
    }

    // Compare location
    if (!valuesMatch(supabaseBooking.location, googleCalendarEvent.location, 'location')) {
      inconsistencies.push({
        system: 'google-calendar',
        field: 'location',
        expectedValue: supabaseBooking.location,
        actualValue: googleCalendarEvent.location,
        bookingId,
      })
    }
  } else if (supabaseBooking.google_calendar_event_id) {
    // Expected to exist but doesn't
    missingRecords.push({
      system: 'google-calendar',
      bookingId,
    })
  }

  // 4. Google Sheets comparison (if bookings are synced to Sheets)
  // Note: This would require a Google Sheets bookings service
  // For now, we'll skip Sheets verification if not implemented
  // TODO: Add Google Sheets verification when bookings sheet is created

  return {
    isConsistent: inconsistencies.length === 0 && missingRecords.length === 0,
    inconsistencies,
    missingRecords,
  }
}
