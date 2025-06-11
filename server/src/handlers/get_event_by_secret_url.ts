
import { db } from '../db';
import { eventsTable, eventDatesTable } from '../db/schema';
import { type GetEventBySecretUrlInput, type EventWithDates } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getEventBySecretUrl = async (input: GetEventBySecretUrlInput): Promise<EventWithDates> => {
  try {
    // Get event and associated dates in one query using join
    const results = await db.select()
      .from(eventsTable)
      .leftJoin(eventDatesTable, eq(eventsTable.id, eventDatesTable.event_id))
      .where(eq(eventsTable.secret_url, input.secret_url))
      .orderBy(asc(eventDatesTable.date))
      .execute();

    if (results.length === 0) {
      throw new Error('Event not found');
    }

    // Extract event data from first result
    const eventData = results[0].events;
    
    // Extract and deduplicate dates (filter out null dates from left join)
    const dates = results
      .filter(result => result.event_dates !== null)
      .map(result => result.event_dates!)
      .filter((date, index, array) => 
        // Deduplicate by id
        array.findIndex(d => d.id === date.id) === index
      );

    return {
      ...eventData,
      dates: dates
    };
  } catch (error) {
    console.error('Get event by secret URL failed:', error);
    throw error;
  }
};
