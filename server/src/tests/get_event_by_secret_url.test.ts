
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventDatesTable } from '../db/schema';
import { type GetEventBySecretUrlInput, type CreateUserInput } from '../schema';
import { getEventBySecretUrl } from '../handlers/get_event_by_secret_url';

// Test data setup
const testUser: CreateUserInput = {
  email: 'organizer@example.com',
  name: 'Test Organizer',
  password: 'password123'
};

const testEventData = {
  organizer_id: 1,
  name: 'Team Meeting',
  details: 'Weekly team sync',
  location: 'Conference Room A',
  suggested_time: '2:00 PM',
  duration_minutes: 60,
  secret_url: 'abc123xyz'
};

const testInput: GetEventBySecretUrlInput = {
  secret_url: 'abc123xyz'
};

describe('getEventBySecretUrl', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get event with dates by secret URL', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    // Create event
    const eventResult = await db.insert(eventsTable)
      .values(testEventData)
      .returning()
      .execute();

    const eventId = eventResult[0].id;

    // Create event dates
    const date1 = new Date('2024-01-15T14:00:00Z');
    const date2 = new Date('2024-01-16T14:00:00Z');

    await db.insert(eventDatesTable)
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
      .execute();

    const result = await getEventBySecretUrl(testInput);

    // Verify event data
    expect(result.id).toEqual(eventId);
    expect(result.name).toEqual('Team Meeting');
    expect(result.details).toEqual('Weekly team sync');
    expect(result.location).toEqual('Conference Room A');
    expect(result.suggested_time).toEqual('2:00 PM');
    expect(result.duration_minutes).toEqual(60);
    expect(result.secret_url).toEqual('abc123xyz');
    expect(result.organizer_id).toEqual(1);
    expect(result.created_at).toBeInstanceOf(Date);

    // Verify dates are included and ordered
    expect(result.dates).toHaveLength(2);
    expect(result.dates[0].date).toEqual(date1);
    expect(result.dates[0].suggested_by_organizer).toBe(true);
    expect(result.dates[1].date).toEqual(date2);
    expect(result.dates[1].suggested_by_organizer).toBe(false);

    // Verify dates have all required fields
    result.dates.forEach(date => {
      expect(date.id).toBeDefined();
      expect(date.event_id).toEqual(eventId);
      expect(date.created_at).toBeInstanceOf(Date);
    });
  });

  it('should get event without dates', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        password_hash: 'hashed_password'
      })
      .execute();

    // Create event without dates
    await db.insert(eventsTable)
      .values(testEventData)
      .execute();

    const result = await getEventBySecretUrl(testInput);

    expect(result.name).toEqual('Team Meeting');
    expect(result.dates).toHaveLength(0);
  });

  it('should throw error for non-existent secret URL', async () => {
    const invalidInput: GetEventBySecretUrlInput = {
      secret_url: 'nonexistent'
    };

    await expect(getEventBySecretUrl(invalidInput)).rejects.toThrow(/event not found/i);
  });

  it('should handle events with nullable fields', async () => {
    // Create user first
    await db.insert(usersTable)
      .values({
        email: testUser.email,
        name: testUser.name,
        password_hash: 'hashed_password'
      })
      .execute();

    // Create event with minimal required fields
    const minimalEventData = {
      organizer_id: 1,
      name: 'Simple Event',
      secret_url: 'minimal123'
    };

    await db.insert(eventsTable)
      .values(minimalEventData)
      .execute();

    const minimalInput: GetEventBySecretUrlInput = {
      secret_url: 'minimal123'
    };

    const result = await getEventBySecretUrl(minimalInput);

    expect(result.name).toEqual('Simple Event');
    expect(result.details).toBeNull();
    expect(result.location).toBeNull();
    expect(result.suggested_time).toBeNull();
    expect(result.duration_minutes).toBeNull();
    expect(result.dates).toHaveLength(0);
  });
});
