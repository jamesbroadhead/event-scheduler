
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

import {
  createUserInputSchema,
  loginInputSchema,
  googleLoginInputSchema,
  createEventInputSchema,
  getEventBySecretUrlInputSchema,
  getEventsByOrganizerInputSchema,
  createAttendeeResponseInputSchema,
  getEventAvailabilityInputSchema
} from './schema';

import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { googleLogin } from './handlers/google_login';
import { createEvent } from './handlers/create_event';
import { getEventBySecretUrl } from './handlers/get_event_by_secret_url';
import { getEventsByOrganizer } from './handlers/get_events_by_organizer';
import { createAttendeeResponse } from './handlers/create_attendee_response';
import { getEventAvailability } from './handlers/get_event_availability';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User authentication
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),
  
  googleLogin: publicProcedure
    .input(googleLoginInputSchema)
    .mutation(({ input }) => googleLogin(input)),
  
  // Event management
  createEvent: publicProcedure
    .input(createEventInputSchema)
    .mutation(({ input }) => createEvent(input)),
  
  getEventBySecretUrl: publicProcedure
    .input(getEventBySecretUrlInputSchema)
    .query(({ input }) => getEventBySecretUrl(input)),
  
  getEventsByOrganizer: publicProcedure
    .input(getEventsByOrganizerInputSchema)
    .query(({ input }) => getEventsByOrganizer(input)),
  
  // Attendee responses
  createAttendeeResponse: publicProcedure
    .input(createAttendeeResponseInputSchema)
    .mutation(({ input }) => createAttendeeResponse(input)),
  
  // Event availability and analytics
  getEventAvailability: publicProcedure
    .input(getEventAvailabilityInputSchema)
    .query(({ input }) => getEventAvailability(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
