
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { EventAvailability } from '../../../server/src/schema';

interface EventAvailabilityViewProps {
  eventId: number;
}

export function EventAvailabilityView({ eventId }: EventAvailabilityViewProps) {
  const [availability, setAvailability] = useState<EventAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAvailability = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getEventAvailability.query({ event_id: eventId });
      setAvailability(data);
    } catch (error) {
      setError('Failed to load event availability');
      console.error('Load availability error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600 bg-green-50';
    if (score >= 3.5) return 'text-blue-600 bg-blue-50';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-50';
    if (score >= 1.5) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 4.5) return '🟢';
    if (score >= 3.5) return '🔵';
    if (score >= 2.5) return '🟡';
    if (score >= 1.5) return '🟠';
    return '🔴';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading availability data...</p>
        </div>
      </div>
    );
  }

  if (error || !availability) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">❌ {error || 'Failed to load data'}</p>
        </CardContent>
      </Card>
    );
  }

  const sortedDates = [...availability.dates].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📊 Event Responses Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {sortedDates.length}
              </div>
              <div className="text-sm text-gray-600">Total Dates</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.max(...sortedDates.map(d => d.response_count), 0)}
              </div>
              <div className="text-sm text-gray-600">Max Responses</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {sortedDates.find(d => d.average_score === Math.max(...sortedDates.map(x => x.average_score)))?.average_score.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Best Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📅 Date-by-Date Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No responses yet. Share your event link to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((dateData, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg">
                          {new Date(dateData.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </h4>
                        {dateData.suggested_by_organizer && (
                          <Badge variant="secondary" className="mt-1">
                            Organizer's Choice
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(dateData.average_score)}`}>
                          {getScoreEmoji(dateData.average_score)} {dateData.average_score.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {dateData.response_count} response{dateData.response_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {dateData.responses.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Attendee Responses:</h5>
                        <div className="grid gap-2">
                          {dateData.responses.map((response, responseIndex) => (
                            <div key={responseIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <span className="text-sm">{response.attendee_name}</span>
                              <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(response.score)}`}>
                                {getScoreEmoji(response.score)} {response.score}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💡 Score Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-red-600 font-semibold">🔴 1</div>
              <div className="text-xs text-gray-600">Can't make it</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-orange-600 font-semibold">🟠 2</div>
              <div className="text-xs text-gray-600">Difficult</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-yellow-600 font-semibold">🟡 3</div>
              <div className="text-xs text-gray-600">Okay</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-blue-600 font-semibold">🔵 4</div>
              <div className="text-xs text-gray-600">Good</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <div className="text-green-600 font-semibold">🟢 5</div>
              <div className="text-xs text-gray-600">Perfect</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
