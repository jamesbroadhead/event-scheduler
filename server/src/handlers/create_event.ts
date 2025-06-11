
import { db } from '../db';
import { eventsTable, eventDatesTable } from '../db/schema';
import { type CreateEventInput, type EventWithDates } from '../schema';
import { eq } from 'drizzle-orm';

export const createEvent = async (input: CreateEventInput): Promise<EventWithDates> => {
  try {
    // Generate a unique secret URL
    const secretUrl = generateSecretUrl();

    // Insert event record
    const eventResult = await db.insert(eventsTable)
      .values({
        organizer_id: input.organizer_id,
        name: input.name,
        details: input.details || null,
        location: input.location || null,
        suggested_time: input.suggested_time || null,
        duration_minutes: input.duration_minutes || null,
        secret_url: secretUrl
      })
      .returning()
      .execute();

    const event = eventResult[0];

    // Insert event dates
    const datePromises = input.preferred_dates.map(date =>
      db.insert(eventDatesTable)
        .values({
          event_id: event.id,
          date: date,
          suggested_by_organizer: true
        })
        .returning()
        .execute()
    );

    const dateResults = await Promise.all(datePromises);
    const dates = dateResults.map(result => result[0]);

    return {
      ...event,
      dates
    };
  } catch (error) {
    console.error('Event creation failed:', error);
    throw error;
  }
};

function generateSecretUrl(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
