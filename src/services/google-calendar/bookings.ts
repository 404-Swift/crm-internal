import { createEvent, updateEvent, deleteEvent, type GoogleCalendarEvent } from './client'
import type { Booking } from '@/types/booking'
import { isConnected } from './oauth'

/**
 * Convert booking to Google Calendar event format
 */
function bookingToGoogleEvent(booking: Booking): Omit<GoogleCalendarEvent, 'id'> {
  // Determine if it's an all-day event (check if times are at start/end of day)
  const startDate = new Date(booking.start_time)
  const endDate = new Date(booking.end_time)
  const isAllDay = 
    startDate.getHours() === 0 && 
    startDate.getMinutes() === 0 && 
    endDate.getHours() === 23 && 
    endDate.getMinutes() === 59

  // Build description with contact/deal info
  let description = booking.description || ''
  if (booking.contact) {
    const contactInfo = `Contact: ${booking.contact.first_name} ${booking.contact.last_name} (${booking.contact.email})`
    description = description ? `${description}\n\n${contactInfo}` : contactInfo
  }
  if (booking.deal) {
    const dealInfo = `Deal: ${booking.deal.title}`
    description = description ? `${description}\n\n${dealInfo}` : dealInfo
  }

  // Build attendees from team members
  const attendees = (booking.team_members || []).map(tm => ({
    email: tm.team_member.email,
    displayName: tm.team_member.name,
  }))

  const event: Omit<GoogleCalendarEvent, 'id'> = {
    summary: booking.title,
    description: description || undefined,
    location: booking.location || undefined,
    attendees: attendees.length > 0 ? attendees : undefined,
    start: isAllDay
      ? { date: startDate.toISOString().split('T')[0] }
      : { dateTime: booking.start_time },
    end: isAllDay
      ? { date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] } // Google uses exclusive end date
      : { dateTime: booking.end_time },
  }

  return event
}

/**
 * Create a calendar event from a booking
 */
export async function createBookingInCalendar(
  booking: Booking,
  calendarId: string = 'primary'
): Promise<string> {
  if (!isConnected()) {
    throw new Error('Google Calendar is not connected. Please connect it in Settings first.')
  }

  try {
    const eventData = bookingToGoogleEvent(booking)
    const event = await createEvent(calendarId, eventData)
    return event.id
  } catch (error) {
    console.error('Failed to create booking in Google Calendar:', error)
    throw error
  }
}

/**
 * Update a calendar event from a booking
 */
export async function updateBookingInCalendar(
  booking: Booking,
  calendarId: string = 'primary'
): Promise<void> {
  if (!isConnected()) {
    throw new Error('Google Calendar is not connected. Please connect it in Settings first.')
  }

  if (!booking.google_calendar_event_id) {
    // If no event ID, create a new event
    // Note: The event ID will be saved back to the booking by the bookings service
    await createBookingInCalendar(booking, calendarId)
    return
  }

  try {
    const eventData = bookingToGoogleEvent(booking)
    await updateEvent(calendarId, booking.google_calendar_event_id, eventData)
  } catch (error) {
    console.error('Failed to update booking in Google Calendar:', error)
    // If event not found, try creating a new one
    if ((error as any).message?.includes('404') || (error as any).message?.includes('Not Found')) {
      await createBookingInCalendar(booking, calendarId)
      // The event ID will be saved by the bookings service
    } else {
      throw error
    }
  }
}

/**
 * Delete a calendar event
 */
export async function deleteBookingFromCalendar(
  googleCalendarEventId: string,
  calendarId: string = 'primary'
): Promise<void> {
  if (!isConnected()) {
    // Silent fail if not connected
    return
  }

  if (!googleCalendarEventId) {
    return
  }

  try {
    await deleteEvent(calendarId, googleCalendarEventId)
  } catch (error) {
    console.error('Failed to delete booking from Google Calendar:', error)
    // Don't throw - allow deletion to succeed even if Calendar delete fails
  }
}
