
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventDatesTable } from '../db/schema';
import { type GetEventsByOrganizerInput } from '../schema';
import { getEventsByOrganizer } from '../handlers/get_events_by_organizer';

const testUser = {
  email: 'organizer@test.com',
  name: 'Test Organizer',
  password_hash: 'hashed_password'
};

const testInput: GetEventsByOrganizerInput = {
  organizer_id: 1
};

describe('getEventsByOrganizer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for organizer with no events', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    const result = await getEventsByOrganizer(testInput);

    expect(result).toEqual([]);
  });

  it('should return events with their dates', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create events
    const eventResults = await db.insert(eventsTable)
      .values([
        {
          organizer_id: 1,
          name: 'Event 1',
          details: 'First event',
          location: 'Location 1',
          suggested_time: '2:00 PM',
          duration_minutes: 60,
          secret_url: 'secret-url-1'
        },
        {
          organizer_id: 1,
          name: 'Event 2',
          details: 'Second event',
          location: 'Location 2',
          suggested_time: '3:00 PM',
          duration_minutes: 90,
          secret_url: 'secret-url-2'
        }
      ])
      .returning()
      .execute();

    // Create dates for first event
    await db.insert(eventDatesTable)
      .values([
        {
          event_id: eventResults[0].id,
          date: new Date('2024-01-15'),
          suggested_by_organizer: true
        },
        {
          event_id: eventResults[0].id,
          date: new Date('2024-01-16'),
          suggested_by_organizer: true
        }
      ])
      .execute();

    // Create one date for second event
    await db.insert(eventDatesTable)
      .values({
        event_id: eventResults[1].id,
        date: new Date('2024-01-20'),
        suggested_by_organizer: false
      })
      .execute();

    const result = await getEventsByOrganizer(testInput);

    expect(result).toHaveLength(2);

    // Check first event
    const event1 = result.find(e => e.name === 'Event 1');
    expect(event1).toBeDefined();
    expect(event1!.organizer_id).toEqual(1);
    expect(event1!.details).toEqual('First event');
    expect(event1!.location).toEqual('Location 1');
    expect(event1!.suggested_time).toEqual('2:00 PM');
    expect(event1!.duration_minutes).toEqual(60);
    expect(event1!.secret_url).toEqual('secret-url-1');
    expect(event1!.dates).toHaveLength(2);
    expect(event1!.dates[0].suggested_by_organizer).toBe(true);

    // Check second event
    const event2 = result.find(e => e.name === 'Event 2');
    expect(event2).toBeDefined();
    expect(event2!.organizer_id).toEqual(1);
    expect(event2!.details).toEqual('Second event');
    expect(event2!.dates).toHaveLength(1);
    expect(event2!.dates[0].suggested_by_organizer).toBe(false);
  });

  it('should return events without dates', async () => {
    // Create user first
    await db.insert(usersTable).values(testUser).execute();

    // Create event without dates
    await db.insert(eventsTable)
      .values({
        organizer_id: 1,
        name: 'Event Without Dates',
        details: null,
        location: null,
        suggested_time: null,
        duration_minutes: null,
        secret_url: 'secret-url-no-dates'
      })
      .execute();

    const result = await getEventsByOrganizer(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Event Without Dates');
    expect(result[0].details).toBeNull();
    expect(result[0].location).toBeNull();
    expect(result[0].suggested_time).toBeNull();
    expect(result[0].duration_minutes).toBeNull();
    expect(result[0].dates).toEqual([]);
  });

  it('should only return events for specified organizer', async () => {
    // Create two users
    await db.insert(usersTable)
      .values([
        testUser,
        {
          email: 'other@test.com',
          name: 'Other Organizer',
          password_hash: 'other_password'
        }
      ])
      .execute();

    // Create events for both users
    await db.insert(eventsTable)
      .values([
        {
          organizer_id: 1,
          name: 'Event by User 1',
          secret_url: 'secret-url-user-1'
        },
        {
          organizer_id: 2,
          name: 'Event by User 2',
          secret_url: 'secret-url-user-2'
        }
      ])
      .execute();

    const result = await getEventsByOrganizer(testInput);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Event by User 1');
    expect(result[0].organizer_id).toEqual(1);
  });
});
