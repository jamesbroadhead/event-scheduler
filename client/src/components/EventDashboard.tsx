
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EventAvailabilityView } from '@/components/EventAvailabilityView';
import { trpc } from '@/utils/trpc';
import type { EventWithDates } from '../../../server/src/schema';

interface EventDashboardProps {
  organizerId: number;
}

export function EventDashboard({ organizerId }: EventDashboardProps) {
  const [events, setEvents] = useState<EventWithDates[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventWithDates | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const eventsData = await trpc.getEventsByOrganizer.query({ organizer_id: organizerId });
      setEvents(eventsData);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organizerId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const copyEventLink = (secretUrl: string) => {
    const eventUrl = `${window.location.origin}${window.location.pathname}?event=${secretUrl}`;
    navigator.clipboard.writeText(eventUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your events...</p>
        </div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedEvent(null)}
          >
            ← Back to Events
          </Button>
          <h2 className="text-xl font-semibold">{selectedEvent.name}</h2>
        </div>
        <EventAvailabilityView eventId={selectedEvent.id} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-gray-400 mb-4">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="text-lg font-medium text-gray-600">No Events Yet</h3>
          </div>
          <p className="text-gray-500 mb-4">
            Create your first event to start scheduling with others!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Events ({events.length})</h2>
      </div>

      <div className="grid gap-4">
        {events.map((event: EventWithDates) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-lg">{event.name}</CardTitle>
                  {event.details && (
                    <p className="text-sm text-gray-600">{event.details}</p>
                  )}
                </div>
                <Badge variant="secondary">
                  {event.dates.length} dates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {event.location && (
                    <div>
                      <span className="font-medium text-gray-700">📍 Location:</span>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  )}
                  {event.suggested_time && (
                    <div>
                      <span className="font-medium text-gray-700">🕐 Time:</span>
                      <p className="text-gray-600">{event.suggested_time}</p>
                    </div>
                  )}
                  {event.duration_minutes && (
                    <div>
                      <span className="font-medium text-gray-700">⏱️ Duration:</span>
                      <p className="text-gray-600">{event.duration_minutes} min</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyEventLink(event.secret_url)}
                  >
                    📋 Copy Link
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSelectedEvent(event)}
                  >
                    📊 View Responses
                  </Button>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {event.created_at.toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
