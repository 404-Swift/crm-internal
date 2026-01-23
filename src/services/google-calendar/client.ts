import { getAccessToken } from './oauth'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  recurringEventId?: string
  recurrence?: string[]
}

export interface GoogleCalendarEventsResponse {
  items: GoogleCalendarEvent[]
  nextPageToken?: string
  nextSyncToken?: string
}

/**
 * Get events from Google Calendar
 */
export async function getEvents(
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 2500,
  syncToken?: string
): Promise<GoogleCalendarEventsResponse> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Google Calendar access token not available. Please authenticate.')
  }

  const params = new URLSearchParams({
    maxResults: maxResults.toString(),
    singleEvents: 'true',
    orderBy: 'startTime',
  })

  if (syncToken) {
    params.append('syncToken', syncToken)
  } else {
    if (timeMin) {
      params.append('timeMin', timeMin)
    }
    if (timeMax) {
      params.append('timeMax', timeMax)
    }
  }

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to fetch calendar events: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get a single event by ID
 */
export async function getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Google Calendar access token not available. Please authenticate.')
  }

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to fetch calendar event: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get list of calendars
 */
export async function getCalendars(): Promise<{ items: Array<{ id: string; summary: string }> }> {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    throw new Error('Google Calendar access token not available. Please authenticate.')
  }

  const url = `${CALENDAR_API_BASE}/users/me/calendarList`
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(error.error?.message || `Failed to fetch calendars: ${response.statusText}`)
  }

  return response.json()
}
