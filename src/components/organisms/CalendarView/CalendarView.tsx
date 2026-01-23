import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns'
import { useBookingsByDateRange } from '@/hooks/useBookings'
import { BookingCard } from '@/components/molecules/BookingCard'
import { Button } from '@/components/atoms/Button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Icon } from '@/components/atoms/Icon'
import { cn } from '@/lib/utils'
import type { Booking } from '@/types/booking'

type ViewType = 'month' | 'week' | 'day'

interface CalendarViewProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function CalendarView({ selectedDate, onDateChange }: CalendarViewProps) {
  const [view, setView] = useState<ViewType>('month')
  const [currentDate, setCurrentDate] = useState(selectedDate)

  // Calculate date range based on view
  const { startDate, endDate } = useMemo(() => {
    if (view === 'month') {
      const start = startOfMonth(currentDate)
      const end = endOfMonth(currentDate)
      return {
        startDate: format(start, 'yyyy-MM-dd\'T\'00:00:00'),
        endDate: format(end, 'yyyy-MM-dd\'T\'23:59:59'),
      }
    } else if (view === 'week') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      return {
        startDate: format(start, 'yyyy-MM-dd\'T\'00:00:00'),
        endDate: format(end, 'yyyy-MM-dd\'T\'23:59:59'),
      }
    } else {
      const day = format(currentDate, 'yyyy-MM-dd')
      return {
        startDate: `${day}T00:00:00`,
        endDate: `${day}T23:59:59`,
      }
    }
  }, [view, currentDate])

  const { bookings, isLoading } = useBookingsByDateRange(startDate, endDate)

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    onDateChange(today)
  }

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, Booking[]> = {}
    bookings.forEach(booking => {
      const dateKey = format(new Date(booking.start_time), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(booking)
    })
    return grouped
  }, [bookings])

  if (isLoading) {
    return <div className="text-muted-foreground">Loading calendar...</div>
  }

  return (
    <div className="space-y-4">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <Icon icon={ChevronLeft} size={18} />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <Icon icon={ChevronRight} size={18} />
          </Button>
          <h2 className="text-xl font-semibold ml-4">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : view === 'week' ? 'MMMM d, yyyy' : 'EEEE, MMMM d, yyyy')}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('month')}
          >
            Month
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            Week
          </Button>
          <Button
            variant={view === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('day')}
          >
            Day
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && <MonthView currentDate={currentDate} bookingsByDate={bookingsByDate} onDateClick={onDateChange} />}
      {view === 'week' && <WeekView currentDate={currentDate} bookingsByDate={bookingsByDate} onDateClick={onDateChange} />}
      {view === 'day' && <DayView currentDate={currentDate} bookingsByDate={bookingsByDate} />}
    </div>
  )
}

function MonthView({
  currentDate,
  bookingsByDate,
  onDateClick,
}: {
  currentDate: Date
  bookingsByDate: Record<string, Booking[]>
  onDateClick: (date: Date) => void
}) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50">
        {weekDays.map(day => (
          <div key={day} className="p-2 text-sm font-medium text-center border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayBookings = bookingsByDate[dateKey] || []
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[100px] border-r border-b last:border-r-0 p-2",
                !isCurrentMonth && "bg-muted/20",
                isToday && "bg-accent/50"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className={cn(
                "text-sm font-medium mb-1",
                isToday && "text-primary font-bold"
              )}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayBookings.slice(0, 3).map(booking => (
                  <BookingCard key={booking.id} booking={booking} compact />
                ))}
                {dayBookings.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayBookings.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  currentDate,
  bookingsByDate,
  onDateClick,
}: {
  currentDate: Date
  bookingsByDate: Record<string, Booking[]>
  onDateClick: (date: Date) => void
}) {
  const weekStart = startOfWeek(currentDate)
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate) })

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayBookings = bookingsByDate[dateKey] || []
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r last:border-r-0 p-4 min-h-[600px]",
                isToday && "bg-accent/20"
              )}
            >
              <div
                className={cn(
                  "text-lg font-semibold mb-4 cursor-pointer",
                  isToday && "text-primary"
                )}
                onClick={() => onDateClick(day)}
              >
                {format(day, 'EEE d')}
              </div>
              <div className="space-y-2">
                {dayBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({
  currentDate,
  bookingsByDate,
}: {
  currentDate: Date
  bookingsByDate: Record<string, Booking[]>
}) {
  const dateKey = format(currentDate, 'yyyy-MM-dd')
  const dayBookings = bookingsByDate[dateKey] || []

  // Group by hour
  const bookingsByHour = useMemo(() => {
    const grouped: Record<number, Booking[]> = {}
    dayBookings.forEach(booking => {
      const hour = new Date(booking.start_time).getHours()
      if (!grouped[hour]) {
        grouped[hour] = []
      }
      grouped[hour].push(booking)
    })
    return grouped
  }, [dayBookings])

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
      </div>
      <div className="divide-y">
        {Array.from({ length: 24 }, (_, i) => i).map(hour => {
          const hourBookings = bookingsByHour[hour] || []
          return (
            <div key={hour} className="p-4 flex gap-4">
              <div className="w-20 text-sm text-muted-foreground">
                {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
              </div>
              <div className="flex-1 space-y-2">
                {hourBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
