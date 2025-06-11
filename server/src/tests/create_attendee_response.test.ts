
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventDatesTable, attendeeResponsesTable, dateAvailabilitiesTable } from '../db/schema';
import { type CreateAttendeeResponseInput } from '../schema';
import { createAttendeeResponse } from '../handlers/create_attendee_response';
import { eq } from 'drizzle-orm';

describe('createAttendeeResponse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testEventId: number;
  let testEventSecretUrl: string;
  let testEventDateId: number;

  const setupTestData = async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        email: 'organizer@test.com',
        name: 'Test Organizer',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    testUserId = userResults[0].id;

    // Create test event
    testEventSecretUrl = 'test-secret-url-123';
    const eventResults = await db.insert(eventsTable)
      .values({
        organizer_id: testUserId,
        name: 'Test Event',
        details: 'Test event details',
        location: 'Test Location',
        suggested_time: '7:00 PM',
        duration_minutes: 120,
        secret_url: testEventSecretUrl
      })
      .returning()
      .execute();

    testEventId = eventResults[0].id;

    // Create test event date
    const eventDateResults = await db.insert(eventDatesTable)
      .values({
        event_id: testEventId,
        date: new Date('2024-01-15T19:00:00Z'),
        suggested_by_organizer: true
      })
      .returning()
      .execute();

    testEventDateId = eventDateResults[0].id;
  };

  it('should create attendee response with availability for existing date', async () => {
    await setupTestData();

    const input: CreateAttendeeResponseInput = {
      event_secret_url: testEventSecretUrl,
      attendee_name: 'John Doe',
      attendee_email: 'john@test.com',
      date_availabilities: [
        {
          date: new Date('2024-01-15T19:00:00Z'),
          score: 5
        }
      ]
    };

    const result = await createAttendeeResponse(input);

    // Verify attendee response was created
    expect(result.id).toBeDefined();
    expect(result.event_id).toEqual(testEventId);
    expect(result.attendee_name).toEqual('John Doe');
    expect(result.attendee_email).toEqual('john@test.com');
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify availability was created
    const availabilities = await db.select()
      .from(dateAvailabilitiesTable)
      .where(eq(dateAvailabilitiesTable.attendee_response_id, result.id))
      .execute();

    expect(availabilities).toHaveLength(1);
    expect(availabilities[0].event_date_id).toEqual(testEventDateId);
    expect(availabilities[0].score).toEqual(5);
  });

  it('should create attendee response with new date suggestions', async () => {
    await setupTestData();

    const newDate = new Date('2024-01-20T19:00:00Z');
    const input: CreateAttendeeResponseInput = {
      event_secret_url: testEventSecretUrl,
      attendee_name: 'Jane Smith',
      attendee_email: null,
      date_availabilities: [
        {
          date: newDate,
          score: 4
        }
      ],
      new_dates: [newDate]
    };

    const result = await createAttendeeResponse(input);

    // Verify attendee response was created
    expect(result.attendee_name).toEqual('Jane Smith');
    expect(result.attendee_email).toBeNull();

    // Verify new event date was created
    const eventDates = await db.select()
      .from(eventDatesTable)
      .where(eq(eventDatesTable.event_id, testEventId))
      .execute();

    expect(eventDates).toHaveLength(2); // Original + new
    const newEventDate = eventDates.find(d => 
      d.date.toISOString().split('T')[0] === newDate.toISOString().split('T')[0]
    );
    expect(newEventDate).toBeDefined();
    expect(newEventDate!.suggested_by_organizer).toEqual(false);

    // Verify availability was created for new date
    const availabilities = await db.select()
      .from(dateAvailabilitiesTable)
      .where(eq(dateAvailabilitiesTable.attendee_response_id, result.id))
      .execute();

    expect(availabilities).toHaveLength(1);
    expect(availabilities[0].event_date_id).toEqual(newEventDate!.id);
    expect(availabilities[0].score).toEqual(4);
  });

  it('should create attendee response with multiple availabilities', async () => {
    await setupTestData();

    // Add another existing event date
    const secondDateResults = await db.insert(eventDatesTable)
      .values({
        event_id: testEventId,
        date: new Date('2024-01-16T19:00:00Z'),
        suggested_by_organizer: true
      })
      .returning()
      .execute();

    const input: CreateAttendeeResponseInput = {
      event_secret_url: testEventSecretUrl,
      attendee_name: 'Multi Attendee',
      attendee_email: 'multi@test.com',
      date_availabilities: [
        {
          date: new Date('2024-01-15T19:00:00Z'),
          score: 5
        },
        {
          date: new Date('2024-01-16T19:00:00Z'),
          score: 3
        }
      ]
    };

    const result = await createAttendeeResponse(input);

    // Verify multiple availabilities were created
    const availabilities = await db.select()
      .from(dateAvailabilitiesTable)
      .where(eq(dateAvailabilitiesTable.attendee_response_id, result.id))
      .execute();

    expect(availabilities).toHaveLength(2);
    
    const availability1 = availabilities.find(a => a.score === 5);
    const availability2 = availabilities.find(a => a.score === 3);
    
    expect(availability1).toBeDefined();
    expect(availability2).toBeDefined();
    expect(availability1!.event_date_id).toEqual(testEventDateId);
    expect(availability2!.event_date_id).toEqual(secondDateResults[0].id);
  });

  it('should throw error for invalid event secret URL', async () => {
    await setupTestData();

    const input: CreateAttendeeResponseInput = {
      event_secret_url: 'invalid-secret-url',
      attendee_name: 'John Doe',
      attendee_email: 'john@test.com',
      date_availabilities: [
        {
          date: new Date('2024-01-15T19:00:00Z'),
          score: 5
        }
      ]
    };

    expect(createAttendeeResponse(input)).rejects.toThrow(/event not found/i);
  });

  it('should create event date automatically for availability on non-existing date', async () => {
    await setupTestData();

    const nonExistingDate = new Date('2024-01-25T19:00:00Z');
    const input: CreateAttendeeResponseInput = {
      event_secret_url: testEventSecretUrl,
      attendee_name: 'Auto Date Creator',
      attendee_email: 'auto@test.com',
      date_availabilities: [
        {
          date: nonExistingDate,
          score: 4
        }
      ]
    };

    const result = await createAttendeeResponse(input);

    // Verify new event date was automatically created
    const eventDates = await db.select()
      .from(eventDatesTable)
      .where(eq(eventDatesTable.event_id, testEventId))
      .execute();

    expect(eventDates).toHaveLength(2); // Original + auto-created
    const autoCreatedDate = eventDates.find(d => 
      d.date.toISOString().split('T')[0] === nonExistingDate.toISOString().split('T')[0]
    );
    expect(autoCreatedDate).toBeDefined();
    expect(autoCreatedDate!.suggested_by_organizer).toEqual(false);

    // Verify availability was created
    const availabilities = await db.select()
      .from(dateAvailabilitiesTable)
      .where(eq(dateAvailabilitiesTable.attendee_response_id, result.id))
      .execute();

    expect(availabilities).toHaveLength(1);
    expect(availabilities[0].event_date_id).toEqual(autoCreatedDate!.id);
    expect(availabilities[0].score).toEqual(4);
  });
});
