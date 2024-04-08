const { google } = require('googleapis');

async function listEvents(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
    });
    const events = res.data.items;
    if (!events || events.length === 0) {
        console.log('No upcoming events found.');
        return;
    }
    console.log('Upcoming 10 events:');
    events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
    });
}

async function getClassroomCalendar(auth) {
    const calendar = google.calendar({ version: 'v3', auth });
    const res = await calendar.calendarList.list();
    const calendars = res.data.items;
    for (const calendar of calendars) {
        if (calendar.description === 'classroom-cal') {
            return calendar.id;
        }
    }
}

module.exports = {
    listEvents,
    getClassroomCalendar
}