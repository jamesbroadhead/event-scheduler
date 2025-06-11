
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, eventsTable, eventDatesTable } from '../db/schema';
import { type CreateEventInput } from '../schema';
import { createEvent } from '../handlers/create_event';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateEventInput = {
  organizer_id: 1,
  name: 'Team Meeting',
  details: 'Weekly team sync',
  location: 'Conference Room A',
  suggested_time: '2:00 PM',
  duration_minutes: 60,
  preferred_dates: [
    new Date('2024-01-15T14:00:00Z'),
    new Date('2024-01-16T14:00:00Z'),
    new Date('2024-01-17T14:00:00Z')
  ]
};

describe('createEvent', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create a test user first (required for foreign key)
    await db.insert(usersTable)
      .values({
        email: 'organizer@test.com',
        name: 'Test Organizer',
        password_hash: 'hashed_password'
      })
      .execute();
  });

  afterEach(resetDB);

  it('should create an event with all fields', async () => {
    const result = await createEvent(testInput);

    // Basic field validation
    expect(result.name).toEqual('Team Meeting');
    expect(result.details).toEqual('Weekly team sync');
    expect(result.location).toEqual('Conference Room A');
    expect(result.suggested_time).toEqual('2:00 PM');
    expect(result.duration_minutes).toEqual(60);
    expect(result.organizer_id).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.secret_url).toBeDefined();
    expect(result.secret_url.length).toEqual(32);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.dates).toHaveLength(3);

    // Validate dates
    result.dates.forEach(date => {
      expect(date.id).toBeDefined();
      expect(date.event_id).toEqual(result.id);
      expect(date.date).toBeInstanceOf(Date);
      expect(date.suggested_by_organizer).toBe(true);
      expect(date.created_at).toBeInstanceOf(Date);
    });

    // Check dates match input
    const resultDates = result.dates.map(d => d.date.getTime()).sort();
    const inputDates = testInput.preferred_dates.map(d => d.getTime()).sort();
    expect(resultDates).toEqual(inputDates);
  });

  it('should save event to database', async () => {
    const result = await createEvent(testInput);

    // Query event from database
    const events = await db.select()
      .from(eventsTable)
      .where(eq(eventsTable.id, result.id))
      .execute();

    expect(events).toHaveLength(1);
    expect(events[0].name).toEqual('Team Meeting');
    expect(events[0].organizer_id).toEqual(1);
    expect(events[0].secret_url).toEqual(result.secret_url);
    expect(events[0].created_at).toBeInstanceOf(Date);
  });

  it('should save event dates to database', async () => {
    const result = await createEvent(testInput);

    // Query event dates from database
    const eventDates = await db.select()
      .from(eventDatesTable)
      .where(eq(eventDatesTable.event_id, result.id))
      .execute();

    expect(eventDates).toHaveLength(3);
    eventDates.forEach(eventDate => {
      expect(eventDate.event_id).toEqual(result.id);
      expect(eventDate.suggested_by_organizer).toBe(true);
      expect(eventDate.date).toBeInstanceOf(Date);
      expect(eventDate.created_at).toBeInstanceOf(Date);
    });

    // Check all preferred dates were saved
    const savedDates = eventDates.map(d => d.date.getTime()).sort();
    const inputDates = testInput.preferred_dates.map(d => d.getTime()).sort();
    expect(savedDates).toEqual(inputDates);
  });

  it('should create event with minimal fields', async () => {
    const minimalInput: CreateEventInput = {
      organizer_id: 1,
      name: 'Simple Event',
      preferred_dates: [new Date('2024-01-15T14:00:00Z')]
    };

    const result = await createEvent(minimalInput);

    expect(result.name).toEqual('Simple Event');
    expect(result.details).toBeNull();
    expect(result.location).toBeNull();
    expect(result.suggested_time).toBeNull();
    expect(result.duration_minutes).toBeNull();
    expect(result.organizer_id).toEqual(1);
    expect(result.dates).toHaveLength(1);
    expect(result.secret_url).toBeDefined();
  });

  it('should generate unique secret URLs', async () => {
    const input1 = { ...testInput, name: 'Event 1' };
    const input2 = { ...testInput, name: 'Event 2' };

    const result1 = await createEvent(input1);
    const result2 = await createEvent(input2);

    expect(result1.secret_url).not.toEqual(result2.secret_url);
    expect(result1.secret_url.length).toEqual(32);
    expect(result2.secret_url.length).toEqual(32);
  });

  it('should handle multiple preferred dates correctly', async () => {
    const manyDatesInput: CreateEventInput = {
      organizer_id: 1,
      name: 'Event with Many Dates',
      preferred_dates: [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-16T11:00:00Z'),
        new Date('2024-01-17T12:00:00Z'),
        new Date('2024-01-18T13:00:00Z'),
        new Date('2024-01-19T14:00:00Z')
      ]
    };

    const result = await createEvent(manyDatesInput);

    expect(result.dates).toHaveLength(5);
    
    // Check each date was created correctly
    result.dates.forEach((date, index) => {
      expect(date.event_id).toEqual(result.id);
      expect(date.suggested_by_organizer).toBe(true);
      expect(date.date.getTime()).toEqual(manyDatesInput.preferred_dates[index].getTime());
    });
  });
});
