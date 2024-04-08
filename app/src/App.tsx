import { useEffect, useMemo, useState } from 'react'
import { Calendar, Navigate, dateFnsLocalizer, Event } from 'react-big-calendar'
// @ts-ignore
import * as TimeGridDefault from 'react-big-calendar/lib/TimeGrid'
import * as dates from 'date-arithmetic'
import { format, parse, startOfWeek, getDay, previousMonday, nextFriday, isMonday, isFriday, sub, add } from 'date-fns'
import { ca, enUS, is } from 'date-fns/locale'
// get env variables
const TimeGrid = TimeGridDefault.default
const locales = {
  'en-US': enUS
}
const HOST = process.env.HOST || 'http://localhost:3001'

interface EventDate {
  dateTime: string
  timeZone: string
}

interface Event {
  title: string,
  start: Date,
  end: Date,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
})

const calculateMinMax = (date: Date, type: boolean) => {
  const operation = type ? add : sub
  const startEnd = type ? localizer.startOf(date, 'day') : localizer.endOf(date, 'day')
  return operation(startEnd, { hours: 7 })
}


function MyWeek({ date,
  localizer,
  max = calculateMinMax(new Date(), false),
  min = calculateMinMax(new Date(), true),
  scrollToTime = localizer.startOf(new Date(), 'day'),
  ...props
}) {
  const currRange = useMemo(
    () => MyWeek.range(date, { localizer }),
    [date, localizer]
  )
  // get 6:00am of the day

  return (
    <TimeGrid
      date={date}
      eventOffset={15}
      localizer={localizer}
      max={max}
      min={min}
      range={currRange}
      scrollToTime={scrollToTime}
      {...props}
    />
  )
}


MyWeek.range = (date, { localizer }) => {
  // get monday of the week at 6am
  const start = isMonday(date) ? date : previousMonday(date)
  // get friday of the week
  const end = isFriday(date) ? date : nextFriday(date)
console
  let current = start
  const range = []

  while (localizer.lte(current, end, 'day')) {
    range.push(current)
    current = localizer.add(current, 1, 'day')
  }

  return range
}

MyWeek.navigate = (date, action, { localizer }) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -3, 'day')

    case Navigate.NEXT:
      return localizer.add(date, 3, 'day')

    default:
      return date
  }
}

MyWeek.title = (date) => {
  return `My awesome week: ${date.toLocaleDateString()}`
}

const useMousePosition = () => {
  const [
    mousePosition,
    setMousePosition
  ] = useState({ x: null, y: null });

  useEffect(() => {
    const updateMousePosition = ev => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    
    window.addEventListener('mousemove', updateMousePosition);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);

  return mousePosition;
};

function App() {
  const [events, setEvents] = useState<Event[]>([
    {
      title: 'Test Event',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1))
    }
  ])
  const mouseLocation = useMousePosition()

  const [showEventDetail, setShowEventDetail] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  const { defaultDate, views } = useMemo(() => {
    return {
      defaultDate: new Date(),
      views: {
        month: true,
        week: MyWeek,
        day: true,
        agenda: true,
      }
    }
  }, [])

  useEffect(() => {
    console.log('fetching events')
    fetch(`${HOST}/events`)
      .then(response => response.json())
      .then(data => setEvents(sanitizeEvents(data)))
  }, [])

  function handleShowEventDetail(event) {
    setSelectedEvent(event)
    setShowEventDetail(true)
  }

  function sanitizeEvents(events: any[]): Event[] {
    console.log(events, "events")
    if (!events) return [{
      title: 'Test Event',
      start: new Date(),
      end: new Date(new Date().setHours(new Date().getHours() + 1))
    }]
    return events.map(event => {
      const { summary, start, end, recurrence } = event
      return {
        title: summary,
        start: new Date(start.dateTime),
        end: new Date(end.dateTime),
      }
    })
  }

  function EventDetail () {
    if (!selectedEvent) return null
    
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: 20 }}>
          <h1>{selectedEvent.title}</h1>
          <p>{selectedEvent.start.toLocaleString()} - {selectedEvent.end.toLocaleString()}</p>
          <button onClick={() => setShowEventDetail(false)}>Close</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '95vh', width: '95vw', margin: '2.5vh 2.5vw'}} onClick={() => setShowEventDetail(false)}>
      
      <Calendar
        onView={() => console.log('view')}
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '95vh', width: '95vw' }}
        views={views}
        title="Class Schedule"
        onSelectEvent={event => console.log(event)}
      />
    </div>
  )
}

export default App
