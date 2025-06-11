
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string().nullable(),
  google_id: z.string().nullable(),
  name: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Event schema
export const eventSchema = z.object({
  id: z.number(),
  organizer_id: z.number(),
  name: z.string(),
  details: z.string().nullable(),
  location: z.string().nullable(),
  suggested_time: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  secret_url: z.string(),
  created_at: z.coerce.date()
});

export type Event = z.infer<typeof eventSchema>;

// Event date schema
export const eventDateSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  date: z.coerce.date(),
  suggested_by_organizer: z.boolean(),
  created_at: z.coerce.date()
});

export type EventDate = z.infer<typeof eventDateSchema>;

// Attendee response schema
export const attendeeResponseSchema = z.object({
  id: z.number(),
  event_id: z.number(),
  attendee_name: z.string(),
  attendee_email: z.string().email().nullable(),
  created_at: z.coerce.date()
});

export type AttendeeResponse = z.infer<typeof attendeeResponseSchema>;

// Date availability schema
export const dateAvailabilitySchema = z.object({
  id: z.number(),
  attendee_response_id: z.number(),
  event_date_id: z.number(),
  score: z.number().int().min(1).max(5),
  created_at: z.coerce.date()
});

export type DateAvailability = z.infer<typeof dateAvailabilitySchema>;

// Input schemas for creating
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  google_id: z.string().optional(),
  name: z.string()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createEventInputSchema = z.object({
  organizer_id: z.number(),
  name: z.string().min(1),
  details: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  suggested_time: z.string().nullable().optional(),
  duration_minutes: z.number().int().positive().nullable().optional(),
  preferred_dates: z.array(z.coerce.date())
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const createAttendeeResponseInputSchema = z.object({
  event_secret_url: z.string(),
  attendee_name: z.string().min(1),
  attendee_email: z.string().email().nullable().optional(),
  date_availabilities: z.array(z.object({
    date: z.coerce.date(),
    score: z.number().int().min(1).max(5)
  })),
  new_dates: z.array(z.coerce.date()).optional()
});

export type CreateAttendeeResponseInput = z.infer<typeof createAttendeeResponseInputSchema>;

// Login schemas
export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const googleLoginInputSchema = z.object({
  google_id: z.string(),
  email: z.string().email(),
  name: z.string()
});

export type GoogleLoginInput = z.infer<typeof googleLoginInputSchema>;

// Query schemas
export const getEventBySecretUrlInputSchema = z.object({
  secret_url: z.string()
});

export type GetEventBySecretUrlInput = z.infer<typeof getEventBySecretUrlInputSchema>;

export const getEventsByOrganizerInputSchema = z.object({
  organizer_id: z.number()
});

export type GetEventsByOrganizerInput = z.infer<typeof getEventsByOrganizerInputSchema>;

export const getEventAvailabilityInputSchema = z.object({
  event_id: z.number()
});

export type GetEventAvailabilityInput = z.infer<typeof getEventAvailabilityInputSchema>;

// Response schemas
export const eventWithDatesSchema = z.object({
  id: z.number(),
  organizer_id: z.number(),
  name: z.string(),
  details: z.string().nullable(),
  location: z.string().nullable(),
  suggested_time: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  secret_url: z.string(),
  created_at: z.coerce.date(),
  dates: z.array(eventDateSchema)
});

export type EventWithDates = z.infer<typeof eventWithDatesSchema>;

export const eventAvailabilitySchema = z.object({
  event: eventSchema,
  dates: z.array(z.object({
    date: z.coerce.date(),
    suggested_by_organizer: z.boolean(),
    responses: z.array(z.object({
      attendee_name: z.string(),
      score: z.number().int().min(1).max(5)
    })),
    average_score: z.number(),
    response_count: z.number()
  }))
});

export type EventAvailability = z.infer<typeof eventAvailabilitySchema>;
