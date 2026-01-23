import { supabase } from './client'
import type { Booking, BookingFormInput, TeamMemberAssignment } from '@/types/booking'
import type { Database } from './types'
import { createBookingInCalendar, updateBookingInCalendar, deleteBookingFromCalendar } from '../google-calendar/bookings'
import { verifyBookingConsistency } from '../sync/verifyConsistency'

type BookingInsert = Database['public']['Tables']['bookings']['Insert']
type BookingUpdate = Database['public']['Tables']['bookings']['Update']

export const bookingsService = {
  async getAll(userId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        ),
        booking_team_members (
          id,
          team_member_id,
          assigned_at,
          assigned_by,
          team_member:team_members (
            id,
            name,
            email,
            role
          )
        )
      `)
      .eq('user_id', userId)
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map((booking: any) => ({
      ...booking,
      contact: booking.contact as Booking['contact'],
      deal: booking.deal as Booking['deal'],
      team_members: ((booking.booking_team_members || []).map((btm: any) => ({
        id: btm.id,
        team_member_id: btm.team_member_id,
        assigned_at: btm.assigned_at,
        assigned_by: btm.assigned_by,
        team_member: btm.team_member,
      })) as TeamMemberAssignment[]),
    })) as Booking[]
  },

  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        ),
        booking_team_members (
          id,
          team_member_id,
          assigned_at,
          assigned_by,
          team_member:team_members (
            id,
            name,
            email,
            role
          )
        )
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate)
      .lte('end_time', endDate)
      .order('start_time', { ascending: true })

    if (error) throw error
    return (data || []).map((booking: any) => ({
      ...booking,
      contact: booking.contact as Booking['contact'],
      deal: booking.deal as Booking['deal'],
      team_members: ((booking.booking_team_members || []).map((btm: any) => ({
        id: btm.id,
        team_member_id: btm.team_member_id,
        assigned_at: btm.assigned_at,
        assigned_by: btm.assigned_by,
        team_member: btm.team_member,
      })) as TeamMemberAssignment[]),
    })) as Booking[]
  },

  async getById(id: string, userId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
    } as Booking
  },

  async getByGoogleCalendarEventId(googleEventId: string, userId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        )
      `)
      .eq('google_calendar_event_id', googleEventId)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
    } as Booking
  },

  async getWithTeamMembers(id: string, userId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        ),
        booking_team_members (
          id,
          team_member_id,
          assigned_at,
          assigned_by,
          team_member:team_members (
            id,
            name,
            email,
            role
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    const booking = {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
      team_members: ((data as any).booking_team_members || []).map((btm: any) => ({
        id: btm.id,
        team_member_id: btm.team_member_id,
        assigned_at: btm.assigned_at,
        assigned_by: btm.assigned_by,
        team_member: btm.team_member,
      })) as TeamMemberAssignment[],
    } as Booking

    return booking
  },

  async create(input: BookingFormInput, userId: string): Promise<Booking> {
    const now = new Date().toISOString()
    const insert: BookingInsert = {
      ...input,
      user_id: userId,
      created_at: now,
      updated_at: now,
    }

    // 1. Write to Supabase first (immediate UI update)
    const { data, error } = await supabase
      .from('bookings')
      .insert(insert as any)
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        )
      `)
      .single()

    if (error) throw error
    
    const booking = {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
    } as Booking

    // 2. Write to Google Calendar (async, background)
    createBookingInCalendar(booking).then(async (eventId) => {
      // Update booking with Google Calendar event ID
        const { error: updateError } = await (supabase
          .from('bookings') as any)
          .update({ 
            google_calendar_event_id: eventId,
            google_calendar_synced_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
          .eq('user_id', userId)
      if (updateError) {
        console.error('Failed to update booking with calendar event ID:', updateError)
      }
    }).catch((err) => {
      console.error('Background Google Calendar sync failed:', err)
    })

    return booking
  },

  async upsertFromGoogleCalendar(
    _googleEventId: string,
    input: Omit<BookingFormInput, 'contact_id' | 'deal_id'> & {
      google_calendar_event_id: string
      google_calendar_synced_at: string
      contact_id?: string | null
      deal_id?: string | null
    },
    userId: string
  ): Promise<Booking> {
    const now = new Date().toISOString()
    const insert: BookingInsert = {
      ...input,
      user_id: userId,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('bookings')
      .upsert(insert as any, {
        onConflict: 'google_calendar_event_id',
        ignoreDuplicates: false,
      })
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        )
      `)
      .single()

    if (error) throw error
    return {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
    } as Booking
  },

  async update(
    id: string,
    input: Partial<BookingFormInput>,
    userId: string
  ): Promise<Booking> {
    // 1. Verify consistency before update (if booking exists and has calendar event)
    const existingBooking = await this.getById(id, userId)
    if (existingBooking?.google_calendar_event_id) {
      try {
        const consistency = await verifyBookingConsistency(id, userId)
        if (!consistency.isConsistent) {
          console.warn('Data inconsistencies detected before update:', consistency.inconsistencies)
          // Log but proceed with update
        }
      } catch (error) {
        // Don't block update if verification fails
        console.warn('Consistency verification failed:', error)
      }
    }

    // 2. Write to Supabase first (immediate UI update)
    const update: BookingUpdate = {
      ...input,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (supabase
      .from('bookings') as any)
      .update(update)
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        contact:contacts (
          first_name,
          last_name,
          email
        ),
        deal:deals (
          title
        )
      `)
      .single()

    if (error) throw error
    
    const booking = {
      ...(data as any),
      contact: (data as any).contact as Booking['contact'],
      deal: (data as any).deal as Booking['deal'],
    } as Booking

    // 3. Write to Google Calendar (async, background)
    if (booking.google_calendar_event_id || existingBooking?.google_calendar_event_id) {
      updateBookingInCalendar(booking).then(async () => {
        // Update sync timestamp
        const { error: updateError } = await (supabase
          .from('bookings') as any)
          .update({ 
            google_calendar_synced_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
          .eq('user_id', userId)
        if (updateError) {
          console.error('Failed to update sync timestamp:', updateError)
        }
      }).catch((err) => {
        console.error('Background Google Calendar sync failed:', err)
      })
    } else {
      // No calendar event ID, create new event
      createBookingInCalendar(booking).then(async (eventId) => {
        // Update booking with Google Calendar event ID
        const { error: updateError } = await (supabase
          .from('bookings') as any)
          .update({ 
            google_calendar_event_id: eventId,
            google_calendar_synced_at: new Date().toISOString(),
          })
          .eq('id', booking.id)
          .eq('user_id', userId)
        if (updateError) {
          console.error('Failed to update booking with calendar event ID:', updateError)
        }
      }).catch((err) => {
        console.error('Background Google Calendar sync failed:', err)
      })
    }

    return booking
  },

  async delete(id: string, userId: string): Promise<void> {
    // Get booking first to get Google Calendar event ID
    const booking = await this.getById(id, userId)
    const googleEventId = booking?.google_calendar_event_id

    // 1. Delete from Supabase first
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    // 2. Delete from Google Calendar (async, background)
    if (googleEventId) {
      deleteBookingFromCalendar(googleEventId).catch((err) => {
        console.error('Background Google Calendar delete failed:', err)
      })
    }
  },

  async assignTeamMember(
    bookingId: string,
    teamMemberId: string,
    assignedBy: string
  ): Promise<void> {
    const { error } = await supabase
      .from('booking_team_members')
      .insert({
        booking_id: bookingId,
        team_member_id: teamMemberId,
        assigned_by: assignedBy,
      } as any)

    if (error) {
      // Ignore duplicate key errors (already assigned)
      if (error.code === '23505') {
        return
      }
      throw error
    }
  },

  async unassignTeamMember(bookingId: string, teamMemberId: string): Promise<void> {
    const { error } = await supabase
      .from('booking_team_members')
      .delete()
      .eq('booking_id', bookingId)
      .eq('team_member_id', teamMemberId)

    if (error) throw error
  },
}
