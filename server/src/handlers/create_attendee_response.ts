
import { db } from '../db';
import { eventsTable, attendeeResponsesTable, eventDatesTable, dateAvailabilitiesTable } from '../db/schema';
import { type CreateAttendeeResponseInput, type AttendeeResponse } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createAttendeeResponse = async (input: CreateAttendeeResponseInput): Promise<AttendeeResponse> => {
  try {
    // Find the event by secret URL
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.secret_url, input.event_secret_url))
      .execute();

    if (events.length === 0) {
      throw new Error('Event not found');
    }

    const event = events[0];

    // Create attendee response
    const attendeeResults = await db.insert(attendeeResponsesTable)
      .values({
        event_id: event.id,
        attendee_name: input.attendee_name,
        attendee_email: input.attendee_email || null
      })
      .returning()
      .execute();

    const attendeeResponse = attendeeResults[0];

    // Get existing event dates
    const existingDates = await db.select()
      .from(eventDatesTable)
      .where(eq(eventDatesTable.event_id, event.id))
      .execute();

    // Create map of existing dates for quick lookup
    const existingDateMap = new Map<string, number>();
    existingDates.forEach(date => {
      const dateKey = date.date.toISOString().split('T')[0];
      existingDateMap.set(dateKey, date.id);
    });

    // Create new dates if provided
    if (input.new_dates && input.new_dates.length > 0) {
      for (const newDate of input.new_dates) {
        const dateKey = newDate.toISOString().split('T')[0];
        
        // Only create if it doesn't already exist
        if (!existingDateMap.has(dateKey)) {
          const newDateResults = await db.insert(eventDatesTable)
            .values({
              event_id: event.id,
              date: newDate,
              suggested_by_organizer: false
            })
            .returning()
            .execute();

          existingDateMap.set(dateKey, newDateResults[0].id);
        }
      }
    }

    // Create date availability records
    for (const availability of input.date_availabilities) {
      const dateKey = availability.date.toISOString().split('T')[0];
      let eventDateId = existingDateMap.get(dateKey);

      // If date doesn't exist, create it as a new attendee-suggested date
      if (!eventDateId) {
        const newDateResults = await db.insert(eventDatesTable)
          .values({
            event_id: event.id,
            date: availability.date,
            suggested_by_organizer: false
          })
          .returning()
          .execute();

        eventDateId = newDateResults[0].id;
        existingDateMap.set(dateKey, eventDateId);
      }

      // Create the availability record
      await db.insert(dateAvailabilitiesTable)
        .values({
          attendee_response_id: attendeeResponse.id,
          event_date_id: eventDateId,
          score: availability.score
        })
        .execute();
    }

    return attendeeResponse;
  } catch (error) {
    console.error('Attendee response creation failed:', error);
    throw error;
  }
};
