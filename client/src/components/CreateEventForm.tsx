
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { trpc } from '@/utils/trpc';
import type { CreateEventInput } from '../../../server/src/schema';

interface CreateEventFormProps {
  organizerId: number;
}

export function CreateEventForm({ organizerId }: CreateEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  const [formData, setFormData] = useState<Omit<CreateEventInput, 'organizer_id' | 'preferred_dates'>>({
    name: '',
    details: null,
    location: null,
    suggested_time: null,
    duration_minutes: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedDates.length === 0) {
      setError('Please select at least one preferred date');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const eventData: CreateEventInput = {
        ...formData,
        organizer_id: organizerId,
        preferred_dates: selectedDates
      };

      const event = await trpc.createEvent.mutate(eventData);
      
      const eventUrl = `${window.location.origin}${window.location.pathname}?event=${event.secret_url}`;
      setSuccess(`Event created successfully! Share this link with attendees: ${eventUrl}`);
      
      // Reset form
      setFormData({
        name: '',
        details: null,
        location: null,
        suggested_time: null,
        duration_minutes: null
      });
      setSelectedDates([]);
    } catch (error) {
      setError('Failed to create event. Please try again.');
      console.error('Create event error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>✨ Create New Event</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-600 text-sm">{success}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigator.clipboard.writeText(success.split('Share this link with attendees: ')[1])}
            >
              📋 Copy Link
            </Button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Team Meeting, Birthday Party, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-details">Details</Label>
            <Textarea
              id="event-details"
              value={formData.details || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setFormData((prev) => ({ ...prev, details: e.target.value || null }))
              }
              placeholder="Add any additional information about the event..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={formData.location || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, location: e.target.value || null }))
                }
                placeholder="Office, Zoom, Restaurant, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suggested-time">Suggested Time</Label>
              <Input
                id="suggested-time"
                value={formData.suggested_time || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, suggested_time: e.target.value || null }))
                }
                placeholder="2:00 PM, Morning, Evening, etc."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration_minutes || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ 
                  ...prev, 
                  duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                }))
              }
              placeholder="60"
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Dates *</Label>
            <DatePicker
              selectedDates={selectedDates}
              onDatesChange={setSelectedDates}
              mode="multiple"
            />
            <p className="text-sm text-gray-500">
              Select dates when you'd prefer to hold this event. Attendees can also suggest additional dates.
            </p>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating Event...' : '🚀 Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
