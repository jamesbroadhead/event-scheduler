
import { db } from '../db';
import { eventsTable, eventDatesTable } from '../db/schema';
import { type GetEventsByOrganizerInput, type EventWithDates } from '../schema';
import { eq } from 'drizzle-orm';

export const getEventsByOrganizer = async (input: GetEventsByOrganizerInput): Promise<EventWithDates[]> => {
  try {
    // Get events with their dates using a join
    const results = await db.select()
      .from(eventsTable)
      .leftJoin(eventDatesTable, eq(eventsTable.id, eventDatesTable.event_id))
      .where(eq(eventsTable.organizer_id, input.organizer_id))
      .execute();

    // Group results by event
    const eventsMap = new Map<number, EventWithDates>();

    for (const result of results) {
      const event = result.events;
      const eventDate = result.event_dates;

      if (!eventsMap.has(event.id)) {
        eventsMap.set(event.id, {
          ...event,
          dates: []
        });
      }

      // Add date if it exists
      if (eventDate) {
        eventsMap.get(event.id)!.dates.push(eventDate);
      }
    }

    return Array.from(eventsMap.values());
  } catch (error) {
    console.error('Get events by organizer failed:', error);
    throw error;
  }
};
