
import { serial, text, pgTable, timestamp, integer, boolean, varchar, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  password_hash: text('password_hash'),
  google_id: varchar('google_id', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const eventsTable = pgTable('events', {
  id: serial('id').primaryKey(),
  organizer_id: integer('organizer_id').references(() => usersTable.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  details: text('details'),
  location: varchar('location', { length: 500 }),
  suggested_time: varchar('suggested_time', { length: 50 }),
  duration_minutes: integer('duration_minutes'),
  secret_url: varchar('secret_url', { length: 255 }).unique().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const eventDatesTable = pgTable('event_dates', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => eventsTable.id).notNull(),
  date: timestamp('date').notNull(),
  suggested_by_organizer: boolean('suggested_by_organizer').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const attendeeResponsesTable = pgTable('attendee_responses', {
  id: serial('id').primaryKey(),
  event_id: integer('event_id').references(() => eventsTable.id).notNull(),
  attendee_name: varchar('attendee_name', { length: 255 }).notNull(),
  attendee_email: varchar('attendee_email', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const dateAvailabilitiesTable = pgTable('date_availabilities', {
  id: serial('id').primaryKey(),
  attendee_response_id: integer('attendee_response_id').references(() => attendeeResponsesTable.id).notNull(),
  event_date_id: integer('event_date_id').references(() => eventDatesTable.id).notNull(),
  score: integer('score').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  events: many(eventsTable),
}));

export const eventsRelations = relations(eventsTable, ({ one, many }) => ({
  organizer: one(usersTable, {
    fields: [eventsTable.organizer_id],
    references: [usersTable.id],
  }),
  dates: many(eventDatesTable),
  attendee_responses: many(attendeeResponsesTable),
}));

export const eventDatesRelations = relations(eventDatesTable, ({ one, many }) => ({
  event: one(eventsTable, {
    fields: [eventDatesTable.event_id],
    references: [eventsTable.id],
  }),
  availabilities: many(dateAvailabilitiesTable),
}));

export const attendeeResponsesRelations = relations(attendeeResponsesTable, ({ one, many }) => ({
  event: one(eventsTable, {
    fields: [attendeeResponsesTable.event_id],
    references: [eventsTable.id],
  }),
  availabilities: many(dateAvailabilitiesTable),
}));

export const dateAvailabilitiesRelations = relations(dateAvailabilitiesTable, ({ one }) => ({
  attendee_response: one(attendeeResponsesTable, {
    fields: [dateAvailabilitiesTable.attendee_response_id],
    references: [attendeeResponsesTable.id],
  }),
  event_date: one(eventDatesTable, {
    fields: [dateAvailabilitiesTable.event_date_id],
    references: [eventDatesTable.id],
  }),
}));

// Export all tables
export const tables = {
  users: usersTable,
  events: eventsTable,
  eventDates: eventDatesTable,
  attendeeResponses: attendeeResponsesTable,
  dateAvailabilities: dateAvailabilitiesTable,
};
