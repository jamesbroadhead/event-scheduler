
import { db } from '../db';
import { eventsTable, eventDatesTable, attendeeResponsesTable, dateAvailabilitiesTable } from '../db/schema';
import { type GetEventAvailabilityInput, type EventAvailability } from '../schema';
import { eq, sql } from 'drizzle-orm';

export const getEventAvailability = async (input: GetEventAvailabilityInput): Promise<EventAvailability> => {
  try {
    // First get the event
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, input.event_id))
      .execute();

    if (events.length === 0) {
      throw new Error('Event not found');
    }

    const event = events[0];

    // Get event dates with availability data
    const datesWithAvailability = await db.select({
      date_id: eventDatesTable.id,
      date: eventDatesTable.date,
      suggested_by_organizer: eventDatesTable.suggested_by_organizer,
      attendee_name: attendeeResponsesTable.attendee_name,
      score: dateAvailabilitiesTable.score
    })
    .from(eventDatesTable)
    .leftJoin(
      dateAvailabilitiesTable,
      eq(eventDatesTable.id, dateAvailabilitiesTable.event_date_id)
    )
    .leftJoin(
      attendeeResponsesTable,
      eq(dateAvailabilitiesTable.attendee_response_id, attendeeResponsesTable.id)
    )
    .where(eq(eventDatesTable.event_id, input.event_id))
    .execute();

    // Group by date and calculate statistics
    const dateMap = new Map<string, {
      date: Date;
      suggested_by_organizer: boolean;
      responses: Array<{ attendee_name: string; score: number }>;
      scores: number[];
    }>();

    for (const row of datesWithAvailability) {
      const dateKey = row.date.toISOString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: row.date,
          suggested_by_organizer: row.suggested_by_organizer,
          responses: [],
          scores: []
        });
      }

      const dateData = dateMap.get(dateKey)!;
      
      if (row.attendee_name && row.score !== null) {
        dateData.responses.push({
          attendee_name: row.attendee_name,
          score: row.score
        });
        dateData.scores.push(row.score);
      }
    }

    // Convert map to array and calculate averages
    const dates = Array.from(dateMap.values()).map(dateData => ({
      date: dateData.date,
      suggested_by_organizer: dateData.suggested_by_organizer,
      responses: dateData.responses,
      average_score: dateData.scores.length > 0 
        ? dateData.scores.reduce((sum: number, score: number) => sum + score, 0) / dateData.scores.length
        : 0,
      response_count: dateData.responses.length
    }));

    return {
      event,
      dates
    };
  } catch (error) {
    console.error('Get event availability failed:', error);
    throw error;
  }
};
