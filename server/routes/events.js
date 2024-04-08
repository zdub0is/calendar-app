const { google } = require('googleapis');

/**
 * example event object from Google Calendar API
  "_id": {
    "$oid": "661428c48d8c334ec3e22e71"
  },
  "kind": "calendar#event",
  "etag": "\"3425177622876000\"",
  "id": "257t45u1vt9kfdn11cjm1tsdro_20240408T190000Z",
  "status": "confirmed",
  "htmlLink": "https://www.google.com/calendar/event?eid=MjU3dDQ1dTF2dDlrZmRuMTFjam0xdHNkcm9fMjAyNDA0MDhUMTkwMDAwWiBjX2Y5N2VlYjFjNTU3NTcxZWNhYzRjYzBjYWNkZjYxYzRkNWJjMmM4MWRiNjhhMjkwMDg4MjJjNTBjODEwOGFmOWZAZw",
  "created": "2024-04-08T15:06:51.000Z",
  "updated": "2024-04-08T15:06:51.438Z",
  "summary": "Lunch Break",
  "creator": {
    "email": "zdubois@perseverenow.org"
  },
  "organizer": {
    "email": "c_f97eeb1c557571ecac4cc0cacdf61c4d5bc2c81db68a29008822c50c8108af9f@group.calendar.google.com",
    "displayName": "Cibola Calendar",
    "self": true
  },
  "start": {
    "dateTime": "2024-04-08T12:00:00-07:00",
    "timeZone": "America/Phoenix"
  },
  "end": {
    "dateTime": "2024-04-08T12:30:00-07:00",
    "timeZone": "America/Phoenix"
  },
  "recurringEventId": "257t45u1vt9kfdn11cjm1tsdro",
  "originalStartTime": {
    "dateTime": "2024-04-08T12:00:00-07:00",
    "timeZone": "America/Phoenix"
  },
  "iCalUID": "257t45u1vt9kfdn11cjm1tsdro@google.com",
  "sequence": 0,
  "reminders": {
    "useDefault": true
  },
  "eventType": "default"
}} 
 */



async function eventRoutes (fastify, options) {
    // Get all events from database, include query parameters for filtering, from database
    fastify.get('/events', async (request, reply) => {
        // check if query parameters are present
        const {from, to} = request.query;
        const projection = {
            _id: 1,
            summary: 1,
            start: 1,
            end: 1,
            recurringEventId: 1,
        }
        let findQuery = {};
        
        if (from && to) {
            findQuery = {
                start: {
                    $gte: new Date(from),
                    $lte: new Date(to)
                }
            };

        }
        const events = await fastify.mongo.db.collection('events').find(findQuery).project(projection).toArray();
        reply.send(events);
    });

    // Update database with all events from Google Calendar API, include recurrance for updating events

    fastify.get('/update-events', async (request, reply) => {
        const {auth, calId} = fastify;
        const calendar = google.calendar({ version: 'v3', auth });
        const res = await calendar.events.list({
            calendarId: calId,
            timeMin: new Date().toISOString(),
            maxResults: 100,
            singleEvents: true,
            orderBy: 'startTime',
        });
        const events = res.data.items;
        if (!events || events.length === 0) {
            console.log('No upcoming events found.');
            return;
        }
        console.log(`Found ${events.length} events. Updating database...`);
        // upsert events into database
        events.map((event) => {
            fastify.mongo.db.collection('events').updateOne(
                { _id: event.id },
                { $set: event },
                { upsert: true }
            );
        });
        reply.send("Events updated");
    }
    );
}
module.exports = eventRoutes;