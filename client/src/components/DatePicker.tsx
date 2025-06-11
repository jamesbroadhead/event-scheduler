
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface DatePickerProps {
  selectedDates: Date[];
  onDatesChange: (dates: Date[]) => void;
  mode?: 'single' | 'multiple';
  availabilityScores?: { [key: string]: number };
  onScoreChange?: (date: Date, score: number) => void;
}

export function DatePicker({ 
  selectedDates, 
  onDatesChange, 
  mode = 'multiple',
  availabilityScores = {},
  onScoreChange
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get first Monday of the week containing the first day
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstMonday.setDate(firstDay.getDate() - daysToSubtract);
    
    const days: Date[] = [];
    const current = new Date(firstMonday);
    
    // Add days until we have covered the entire month and completed the last week
    while (current <= lastDay || current.getDay() !== 1) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
      
      // Safety check to prevent infinite loop
      if (days.length > 42) break;
    }
    
    return days;
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.toDateString() === date.toDateString()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date: Date) => {
    if (isPastDate(date)) return;

    const dateString = date.toDateString();
    const isSelected = isDateSelected(date);
    
    if (mode === 'single') {
      onDatesChange(isSelected ? [] : [date]);
    } else {
      if (isSelected) {
        onDatesChange(selectedDates.filter(d => d.toDateString() !== dateString));
      } else {
        onDatesChange([...selectedDates, date]);
      }
    }
  };

  const handleScoreClick = (date: Date, score: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onScoreChange) {
      onScoreChange(date, score);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const monthDays = getMonthDays(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getScoreColor = (score: number) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-blue-500',
      5: 'bg-green-500'
    };
    return colors[score as keyof typeof colors] || 'bg-gray-300';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            ←
          </Button>
          <h3 className="text-lg font-semibold">{monthName}</h3>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            →
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthDays.map((date, index) => {
            const isSelected = isDateSelected(date);
            const isCurrentMonthDate = isCurrentMonth(date);
            const isPast = isPastDate(date);
            const dateString = date.toISOString().split('T')[0];
            const score = availabilityScores[dateString];

            return (
              <div key={index} className="relative">
                <Button
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={`
                    w-full h-12 p-1 text-sm
                    ${!isCurrentMonthDate ? 'text-gray-300' : ''}
                    ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                    ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  `}
                  onClick={() => handleDateClick(date)}
                  disabled={isPast}
                >
                  <div className="flex flex-col items-center">
                    <span>{date.getDate()}</span>
                    {score && (
                      <div className={`w-2 h-2 rounded-full ${getScoreColor(score)} mt-1`} />
                    )}
                  </div>
                </Button>

                {/* Score selection buttons for attendee view */}
                {isSelected && onScoreChange && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-md shadow-lg p-2 mt-1">
                    <div className="text-xs text-gray-600 mb-1">Rate availability:</div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(scoreValue => (
                        <Button
                          key={scoreValue}
                          size="sm"
                          variant={score === scoreValue ? "default" : "outline"}
                          className={`
                            w-6 h-6 p-0 text-xs
                            ${score === scoreValue ? getScoreColor(scoreValue) : ''}
                          `}
                          onClick={(e) => handleScoreClick(date, scoreValue, e)}
                        >
                          {scoreValue}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {onScoreChange && (
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-2">Rating Scale:</p>
            <div className="flex flex-wrap gap-2">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                1 - Can't make it
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                2 - Difficult
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                3 - Okay
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                4 - Good
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                5 - Perfect
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
