
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/DatePicker';
import { trpc } from '@/utils/trpc';
import type { EventWithDates, CreateAttendeeResponseInput } from '../../../server/src/schema';

interface AttendeeViewProps {
  secretUrl: string;
}

export function AttendeeView({ secretUrl }: AttendeeViewProps) {
  const [event, setEvent] = useState<EventWithDates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [newDates, setNewDates] = useState<Date[]>([]);
  const [scores, setScores] = useState<{ [key: string]: number }>({});

  const loadEvent = useCallback(async () => {
    try {
      setIsLoading(true);
      const eventData = await trpc.getEventBySecretUrl.query({ secret_url: secretUrl });
      setEvent(eventData);
      
      // Pre-select organizer's preferred dates
      const preferredDates = eventData.dates.map(d => new Date(d.date));
      setSelectedDates(preferredDates);
      
      // Initialize scores for preferred dates
      const initialScores: { [key: string]: number } = {};
      preferredDates.forEach(dateItem => {
        initialScores[dateItem.toISOString().split('T')[0]] = 3; // Default to "okay"
      });
      setScores(initialScores);
    } catch (error) {
      setError('Event not found or invalid URL');
      console.error('Load event error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [secretUrl]);

  useEffect(() => {
    if (secretUrl) {
      loadEvent();
    }
  }, [secretUrl, loadEvent]);

  const handleDateSelection = (dates: Date[]) => {
    setSelectedDates(dates);
    
    // Update scores to include new dates with default score
    const newScores = { ...scores };
    dates.forEach(dateItem => {
      const dateString = dateItem.toISOString().split('T')[0];
      if (!newScores[dateString]) {
        newScores[dateString] = 3; // Default to "okay"
      }
    });
    
    // Remove scores for unselected dates
    Object.keys(newScores).forEach(dateString => {
      if (!dates.some(d => d.toISOString().split('T')[0] === dateString)) {
        delete newScores[dateString];
      }
    });
    
    setScores(newScores);
  };

  const handleScoreChange = (date: Date, score: number) => {
    const dateString = date.toISOString().split('T')[0];
    setScores(prev => ({
      ...prev,
      [dateString]: score
    }));
  };

  const handleNewDateSelection = (dates: Date[]) => {
    setNewDates(dates);
    
    // Add scores for new dates
    const newScores = { ...scores };
    dates.forEach(dateItem => {
      const dateString = dateItem.toISOString().split('T')[0];
      if (!newScores[dateString]) {
        newScores[dateString] = 3; // Default to "okay"
      }
    });
    setScores(newScores);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!attendeeName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (selectedDates.length === 0 && newDates.length === 0) {
      setError('Please select at least one date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Combine selected dates and new dates for availability scoring
      const allDates = [...selectedDates, ...newDates];
      const dateAvailabilities = allDates.map(dateItem => ({
        date: dateItem,
        score: scores[dateItem.toISOString().split('T')[0]] || 3
      }));

      const responseData: CreateAttendeeResponseInput = {
        event_secret_url: secretUrl,
        attendee_name: attendeeName.trim(),
        attendee_email: attendeeEmail.trim() || null,
        date_availabilities: dateAvailabilities,
        new_dates: newDates.length > 0 ? newDates : undefined
      };

      await trpc.createAttendeeResponse.mutate(responseData);
      setSuccess(true);
    } catch (error) {
      setError('Failed to submit response. Please try again.');
      console.error('Submit response error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <p className="text-gray-500">Please check the event URL and try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-green-600 mb-4">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-xl font-semibold">Response Submitted!</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Thank you for responding to <strong>{event?.name}</strong>. 
            The organizer will be able to see your availability.
          </p>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Submit Another Response
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">🎯 {event.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {event.details && (
              <div>
                <h4 className="font-medium text-gray-700">Details:</h4>
                <p className="text-gray-600">{event.details}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {event.location && (
                <div>
                  <h4 className="font-medium text-gray-700">📍 Location:</h4>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              )}
              
              {event.suggested_time && (
                <div>
                  <h4 className="font-medium text-gray-700">🕐 Time:</h4>
                  <p className="text-gray-600">{event.suggested_time}</p>
                </div>
              )}
              
              {event.duration_minutes && (
                <div>
                  <h4 className="font-medium text-gray-700">⏱️ Duration:</h4>
                  <p className="text-gray-600">{event.duration_minutes} minutes</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📅 Select Your Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attendee-name">Your Name *</Label>
                <Input
                  id="attendee-name"
                  value={attendeeName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setAttendeeName(e.target.value)
                  }
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attendee-email">Email (optional)</Label>
                <Input
                  id="attendee-email"
                  type="email"
                  value={attendeeEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setAttendeeEmail(e.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  Proposed Dates - Rate Your Availability
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  Select dates and rate how well they work for you (1-5 scale)
                </p>
                <DatePicker
                  selectedDates={selectedDates}
                  onDatesChange={handleDateSelection}
                  mode="multiple"
                  availabilityScores={scores}
                  onScoreChange={handleScoreChange}
                />
              </div>

              <div>
                <Label className="text-base font-medium">
                  Suggest Additional Dates (Optional)
                </Label>
                <p className="text-sm text-gray-600 mb-3">
                  Can't make any of the proposed dates? Suggest alternatives!
                </p>
                <DatePicker
                  selectedDates={newDates}
                  onDatesChange={handleNewDateSelection}
                  mode="multiple"
                  availabilityScores={scores}
                  onScoreChange={handleScoreChange}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : '🚀 Submit Availability'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
