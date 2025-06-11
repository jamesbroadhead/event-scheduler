
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventDatesTable, attendeeResponsesTable, dateAvailabilitiesTable } from '../db/schema';
import { type GetEventAvailabilityInput } from '../schema';
import { getEventAvailability } from '../handlers/get_event_availability';

describe('getEventAvailability', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get event availability with responses', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'organizer@test.com',
        name: 'Test Organizer',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create test event
    const events = await db.insert(eventsTable)
      .values({
        organizer_id: userId,
        name: 'Test Event',
        details: 'Test details',
        location: 'Test Location',
        secret_url: 'test-secret-123'
      })
      .returning()
      .execute();

    const eventId = events[0].id;

    // Create event dates
    const date1 = new Date('2024-01-15T10:00:00Z');
    const date2 = new Date('2024-01-16T14:00:00Z');

    const eventDates = await db.insert(eventDatesTable)
      .values([
        {
          event_id: eventId,
          date: date1,
          suggested_by_organizer: true
        },
        {
          event_id: eventId,
          date: date2,
          suggested_by_organizer: false
        }
      ])
      .returning()
      .execute();

    const date1Id = eventDates[0].id;
    const date2Id = eventDates[1].id;

    // Create attendee responses
    const attendees = await db.insert(attendeeResponsesTable)
      .values([
        {
          event_id: eventId,
          attendee_name: 'Alice',
          attendee_email: 'alice@test.com'
        },
        {
          event_id: eventId,
          attendee_name: 'Bob',
          attendee_email: 'bob@test.com'
        }
      ])
      .returning()
      .execute();

    const aliceId = attendees[0].id;
    const bobId = attendees[1].id;

    // Create date availabilities
    await db.insert(dateAvailabilitiesTable)
      .values([
        // Alice's availability
        { attendee_response_id: aliceId, event_date_id: date1Id, score: 5 },
        { attendee_response_id: aliceId, event_date_id: date2Id, score: 3 },
        // Bob's availability
        { attendee_response_id: bobId, event_date_id: date1Id, score: 4 },
        { attendee_response_id: bobId, event_date_id: date2Id, score: 2 }
      ])
      .execute();

    const input: GetEventAvailabilityInput = {
      event_id: eventId
    };

    const result = await getEventAvailability(input);

    // Verify event data
    expect(result.event.id).toEqual(eventId);
    expect(result.event.name).toEqual('Test Event');
    expect(result.event.details).toEqual('Test details');
    expect(result.event.location).toEqual('Test Location');

    // Verify dates data
    expect(result.dates).toHaveLength(2);

    // Sort dates by date for consistent testing
    result.dates.sort((a, b) => a.date.getTime() - b.date.getTime());

    // First date (2024-01-15)
    const firstDate = result.dates[0];
    expect(firstDate.date).toEqual(date1);
    expect(firstDate.suggested_by_organizer).toBe(true);
    expect(firstDate.responses).toHaveLength(2);
    expect(firstDate.response_count).toEqual(2);
    expect(firstDate.average_score).toEqual(4.5); // (5 + 4) / 2

    // Check responses for first date
    firstDate.responses.sort((a, b) => a.attendee_name.localeCompare(b.attendee_name));
    expect(firstDate.responses[0].attendee_name).toEqual('Alice');
    expect(firstDate.responses[0].score).toEqual(5);
    expect(firstDate.responses[1].attendee_name).toEqual('Bob');
    expect(firstDate.responses[1].score).toEqual(4);

    // Second date (2024-01-16)
    const secondDate = result.dates[1];
    expect(secondDate.date).toEqual(date2);
    expect(secondDate.suggested_by_organizer).toBe(false);
    expect(secondDate.responses).toHaveLength(2);
    expect(secondDate.response_count).toEqual(2);
    expect(secondDate.average_score).toEqual(2.5); // (3 + 2) / 2

    // Check responses for second date
    secondDate.responses.sort((a, b) => a.attendee_name.localeCompare(b.attendee_name));
    expect(secondDate.responses[0].attendee_name).toEqual('Alice');
    expect(secondDate.responses[0].score).toEqual(3);
    expect(secondDate.responses[1].attendee_name).toEqual('Bob');
    expect(secondDate.responses[1].score).toEqual(2);
  });

  it('should handle event with no responses', async () => {
    // Create test user and event
    const users = await db.insert(usersTable)
      .values({
        email: 'organizer@test.com',
        name: 'Test Organizer',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    const events = await db.insert(eventsTable)
      .values({
        organizer_id: users[0].id,
        name: 'Empty Event',
        secret_url: 'empty-secret-123'
      })
      .returning()
      .execute();

    const eventId = events[0].id;

    // Create event date with no responses
    await db.insert(eventDatesTable)
      .values({
        event_id: eventId,
        date: new Date('2024-01-15T10:00:00Z'),
        suggested_by_organizer: true
      })
      .execute();

    const input: GetEventAvailabilityInput = {
      event_id: eventId
    };

    const result = await getEventAvailability(input);

    expect(result.event.id).toEqual(eventId);
    expect(result.dates).toHaveLength(1);
    expect(result.dates[0].responses).toHaveLength(0);
    expect(result.dates[0].response_count).toEqual(0);
    expect(result.dates[0].average_score).toEqual(0);
  });

  it('should throw error for non-existent event', async () => {
    const input: GetEventAvailabilityInput = {
      event_id: 999999
    };

    expect(getEventAvailability(input)).rejects.toThrow(/event not found/i);
  });

  it('should handle event with dates but no responses', async () => {
    // Create test data
    const users = await db.insert(usersTable)
      .values({
        email: 'organizer@test.com',
        name: 'Test Organizer',
        password_hash: 'hash123'
      })
      .returning()
      .execute();

    const events = await db.insert(eventsTable)
      .values({
        organizer_id: users[0].id,
        name: 'Test Event',
        secret_url: 'test-secret-123'
      })
      .returning()
      .execute();

    const eventId = events[0].id;

    // Create multiple dates with no responses
    const testDates = [
      new Date('2024-01-15T10:00:00Z'),
      new Date('2024-01-16T14:00:00Z'),
      new Date('2024-01-17T16:00:00Z')
    ];

    await db.insert(eventDatesTable)
      .values([
        { event_id: eventId, date: testDates[0], suggested_by_organizer: true },
        { event_id: eventId, date: testDates[1], suggested_by_organizer: false },
        { event_id: eventId, date: testDates[2], suggested_by_organizer: true }
      ])
      .execute();

    const input: GetEventAvailabilityInput = {
      event_id: eventId
    };

    const result = await getEventAvailability(input);

    expect(result.dates).toHaveLength(3);
    
    result.dates.forEach(dateData => {
      expect(dateData.responses).toHaveLength(0);
      expect(dateData.response_count).toEqual(0);
      expect(dateData.average_score).toEqual(0);
      expect(dateData.date).toBeInstanceOf(Date);
      expect(typeof dateData.suggested_by_organizer).toBe('boolean');
    });
  });
});
