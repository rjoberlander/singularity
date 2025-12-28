import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  autoOpen?: boolean;  // Auto-open the picker when mounted
  hideInput?: boolean;  // Hide the input field (only show dropdown when open)
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, className, autoOpen = false, hideInput = false }) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);

  // Calendar view state
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      return new Date(value);
    }
    return new Date();
  });

  // Hover state to highlight dates on calendar
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [originalViewDate, setOriginalViewDate] = useState<Date | null>(null);

  // Handle hover with automatic month navigation
  const handleDateHover = (date: Date) => {
    setHoveredDate(date);

    // If hovered date is in a different month, temporarily navigate to that month
    if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
      // Save original view date if not already saved
      if (!originalViewDate) {
        setOriginalViewDate(new Date(viewDate));
      }
      setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const handleDateHoverEnd = () => {
    setHoveredDate(null);

    // Restore original view date when hover ends
    if (originalViewDate) {
      setViewDate(originalViewDate);
      setOriginalViewDate(null);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate position when dropdown opens
  useEffect(() => {
    if (isOpen && inputWrapperRef.current && !dropdownPosition) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
  }, [isOpen, dropdownPosition]);

  const formatDate = (date: Date): string => {
    // CRITICAL: Set time to noon UTC to prevent timezone shifts
    // When database sees "2025-11-12T12:00:00Z", it stays November 12th in ALL timezones
    // This ensures the date displayed = date stored for ALL users globally
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T12:00:00Z`;
  };

  // Get color for day of week bubble
  const getDayColor = (dayOfWeek: number): string => {
    const colors: Record<number, string> = {
      0: 'bg-pink-500',    // Sunday
      1: 'bg-blue-500',    // Monday
      2: 'bg-green-500',   // Tuesday
      3: 'bg-yellow-500',  // Wednesday
      4: 'bg-orange-500',  // Thursday
      5: 'bg-purple-500',  // Friday
      6: 'bg-red-500'      // Saturday
    };
    return colors[dayOfWeek] || 'bg-gray-500';
  };

  // Helper to check if date is today
  const isDateToday = (dateString: string) => {
    if (!dateString) return false;
    // Extract date portion only (ignore time/timezone)
    const date = new Date(dateString);
    const today = new Date();
    // Compare year, month, day only (timezone-safe)
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  };

  // Helper to check if date is tomorrow
  const isDateTomorrow = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Compare year, month, day only (timezone-safe)
    return date.getFullYear() === tomorrow.getFullYear() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getDate() === tomorrow.getDate();
  };

  // Helper to get days overdue
  const getDaysOverdue = (dateString: string) => {
    if (!dateString) return 0;
    // Create dates at midnight local time for accurate day calculation
    const dueDate = new Date(dateString);
    const today = new Date();
    // Set both to midnight to compare dates only
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - dueDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return null;
    // Parse date in a timezone-safe way
    const date = new Date(dateString);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Extract date components (timezone-aware)
    const dayOfWeekIndex = date.getDay();
    const dayOfWeek = days[dayOfWeekIndex];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const dayColor = getDayColor(dayOfWeekIndex);

    return (
      <span className="flex items-center gap-1.5">
        <span>{month}{day}</span>
        <span
          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${dayColor}`}
          title={dayOfWeek}
        >
          {dayOfWeek.substring(0, 1)}
        </span>
      </span>
    );
  };

  // Helper to get day of week abbreviation
  const getDayOfWeek = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
  };

  // Helper to add weekdays (excluding weekends)
  const addWeekdays = (startDate: Date, numWeekdays: number): Date => {
    const result = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < numWeekdays) {
      result.setDate(result.getDate() + 1);
      const dayOfWeek = result.getDay();

      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        daysAdded++;
      }
    }

    return result;
  };

  const getNextFriday = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
    const friday = new Date(today);
    friday.setDate(today.getDate() + daysUntilFriday);
    return friday;
  };

  const getEndOfNextWeek = (): Date => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calculate days until next Friday (7 days after this week's Friday)
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
    const nextWeekFriday = new Date(today);
    nextWeekFriday.setDate(today.getDate() + daysUntilFriday + 7);
    return nextWeekFriday;
  };

  const getEndOfMonth = (): Date => {
    const today = new Date();
    let endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // If end of month falls on weekend, move to Friday before
    const dayOfWeek = endOfMonth.getDay();
    if (dayOfWeek === 0) {
      // Sunday - move back 2 days to Friday
      endOfMonth.setDate(endOfMonth.getDate() - 2);
    } else if (dayOfWeek === 6) {
      // Saturday - move back 1 day to Friday
      endOfMonth.setDate(endOfMonth.getDate() - 1);
    }

    return endOfMonth;
  };

  const handleQuickSelect = (option: string) => {
    const today = new Date();
    let targetDate: Date;

    switch (option) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        // Tomorrow = 1 weekday from today
        targetDate = addWeekdays(today, 1);
        break;
      case 'in3days':
        // In 3 days = 3 weekdays from today
        targetDate = addWeekdays(today, 3);
        break;
      case 'in7days':
        // In 7 days = 7 calendar days (including weekends)
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + 7);
        break;
      case 'endofweek':
        targetDate = getNextFriday();
        break;
      case 'endofnextweek':
        targetDate = getEndOfNextWeek();
        break;
      case 'endofmonth':
        targetDate = getEndOfMonth();
        break;
      default:
        return;
    }

    onChange(formatDate(targetDate));
    setIsOpen(false);
  };

  // Calendar navigation
  const handlePrevMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleDateClick = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(formatDate(selectedDate));
    setIsOpen(false);
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty slots for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getMonthYearString = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  };

  const isDateInPast = (day: number) => {
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  const isSelectedDateOverdue = () => {
    if (!value) return false;
    const selectedDate = new Date(value);
    selectedDate.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === viewDate.getMonth() &&
           selectedDate.getFullYear() === viewDate.getFullYear();
  };

  const isToday = (day: number) => {
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate.getTime() === today.getTime();
  };

  const isWeekend = (day: number) => {
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dayOfWeek = checkDate.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  const isHoveredDate = (day: number) => {
    if (!hoveredDate) return false;
    return hoveredDate.getDate() === day &&
           hoveredDate.getMonth() === viewDate.getMonth() &&
           hoveredDate.getFullYear() === viewDate.getFullYear();
  };

  const getHoveredDayColor = (day: number): string => {
    if (!hoveredDate) return '';
    const checkDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const dayOfWeek = checkDate.getDay();

    const ringColors: Record<number, string> = {
      0: 'ring-pink-500 bg-pink-100 dark:bg-pink-900/30',    // Sunday
      1: 'ring-blue-500 bg-blue-100 dark:bg-blue-900/30',    // Monday
      2: 'ring-green-500 bg-green-100 dark:bg-green-900/30', // Tuesday
      3: 'ring-yellow-500 bg-yellow-100 dark:bg-yellow-900/30', // Wednesday
      4: 'ring-orange-500 bg-orange-100 dark:bg-orange-900/30', // Thursday
      5: 'ring-purple-500 bg-purple-100 dark:bg-purple-900/30', // Friday
      6: 'ring-red-500 bg-red-100 dark:bg-red-900/30'        // Saturday
    };

    return ringColors[dayOfWeek] || '';
  };

  const handleOpenDropdown = () => {
    if (inputWrapperRef.current) {
      const rect = inputWrapperRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left
      });
    }
    setIsOpen(true);
  };

  // Get color for day of week (string version for Quick Select bubbles)
  const getDayColorByName = (dayAbbr: string): string => {
    const colors: Record<string, string> = {
      'Mon': 'bg-blue-500',
      'Tue': 'bg-green-500',
      'Wed': 'bg-yellow-500',
      'Thu': 'bg-orange-500',
      'Fri': 'bg-purple-500',
      'Sat': 'bg-red-500',
      'Sun': 'bg-pink-500'
    };
    return colors[dayAbbr] || 'bg-gray-500';
  };

  // Day bubble component
  const DayBubble = ({ day }: { day: string }) => (
    <span
      className={`inline-flex items-center justify-center w-7 h-5 rounded-full text-xs font-bold text-white ${getDayColorByName(day)}`}
      title={day}
    >
      {day.substring(0, 1)}
    </span>
  );

  // Get target dates for Quick Select options
  const getQuickSelectDates = () => {
    const today = new Date();
    const tomorrow = addWeekdays(today, 1);
    const in3Days = addWeekdays(today, 3);

    // in 7 Days uses calendar days (including weekends)
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const nextFriday = getNextFriday();
    const nextWeekFriday = getEndOfNextWeek();
    const endOfMonth = getEndOfMonth();

    return {
      today,
      tomorrow,
      in3Days,
      in7Days,
      endOfWeek: nextFriday,
      endOfNextWeek: nextWeekFriday,
      endOfMonth
    };
  };

  // Get button labels with day of week bubbles
  const getQuickSelectLabels = () => {
    const dates = getQuickSelectDates();

    return {
      today: { text: 'Today', day: getDayOfWeek(dates.today), date: dates.today },
      tomorrow: { text: 'Tomorrow', day: getDayOfWeek(dates.tomorrow), date: dates.tomorrow },
      in3Days: { text: 'in 3 Days', day: getDayOfWeek(dates.in3Days), date: dates.in3Days },
      in7Days: { text: 'in 7 Days', day: getDayOfWeek(dates.in7Days), date: dates.in7Days },
      endOfWeek: { text: 'End of Week', day: getDayOfWeek(dates.endOfWeek), date: dates.endOfWeek },
      endOfNextWeek: { text: 'End of Next Week', day: getDayOfWeek(dates.endOfNextWeek), date: dates.endOfNextWeek },
      endOfMonth: { text: 'End of Month', day: getDayOfWeek(dates.endOfMonth), date: dates.endOfMonth }
    };
  };

  return (
    <div ref={inputWrapperRef} className="relative">
      {!hideInput && (
        <div>
          <div
            onClick={handleOpenDropdown}
            className={`flex items-center h-10 w-full rounded-md px-1 py-1 text-sm ring-offset-background cursor-pointer transition-colors ${
              !value
                ? `border-2 border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 ${className}`
                : getDaysOverdue(value) > 0
                ? `border-2 border-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 ${className}`
                : (isDateToday(value) || isDateTomorrow(value))
                ? `border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 ${className}`
                : `border border-input bg-background hover:bg-accent ${className}`
            }`}
          >
            {value ? formatDisplayDate(value) : <span className="text-muted-foreground">Select date</span>}
          </div>
        {value && getDaysOverdue(value) > 0 && (
          <div className="mt-0 text-[10px] font-semibold text-red-600 dark:text-red-400 px-1 leading-tight">
            Due <span className="text-sm font-bold">{getDaysOverdue(value)}</span> Day{getDaysOverdue(value) !== 1 ? 's' : ''} Ago
          </div>
        )}
        {value && getDaysOverdue(value) === 0 && isDateToday(value) && (
          <div className="mt-0 text-[10px] font-semibold text-orange-600 dark:text-orange-400 px-1 leading-tight">
            Due: Today
          </div>
        )}
        {value && getDaysOverdue(value) === 0 && isDateTomorrow(value) && (
          <div className="mt-0 text-[10px] font-semibold text-orange-600 dark:text-orange-400 px-1 leading-tight">
            Due: Tomorrow
          </div>
        )}
        </div>
      )}

      {isOpen && dropdownPosition && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Large Dropdown with 2 columns - Fixed positioning to escape table overflow */}
          <div
            style={{
              position: 'fixed',
              top: `${Math.min(dropdownPosition.top, window.innerHeight - 400)}px`,
              left: `${Math.min(dropdownPosition.left, window.innerWidth - 450)}px`,
              maxHeight: '380px',
              overflow: 'auto'
            }}
            className="z-50 bg-gray-50 dark:bg-gray-900 border-2 border-blue-500 dark:border-blue-400 rounded-lg shadow-2xl p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1">
            {/* Left Column: Quick Select Options - Fixed narrow width */}
            <div className="space-y-1 w-[155px] flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 px-1">Quick Select</h3>
              {(() => {
                const labels = getQuickSelectLabels();
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('today')}
                      onMouseEnter={() => handleDateHover(labels.today.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.today.text}</span>
                      <DayBubble day={labels.today.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('tomorrow')}
                      onMouseEnter={() => handleDateHover(labels.tomorrow.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.tomorrow.text}</span>
                      <DayBubble day={labels.tomorrow.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('in3days')}
                      onMouseEnter={() => handleDateHover(labels.in3Days.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.in3Days.text}</span>
                      <DayBubble day={labels.in3Days.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('in7days')}
                      onMouseEnter={() => handleDateHover(labels.in7Days.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.in7Days.text}</span>
                      <DayBubble day={labels.in7Days.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('endofweek')}
                      onMouseEnter={() => handleDateHover(labels.endOfWeek.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.endOfWeek.text}</span>
                      <DayBubble day={labels.endOfWeek.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('endofnextweek')}
                      onMouseEnter={() => handleDateHover(labels.endOfNextWeek.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.endOfNextWeek.text}</span>
                      <DayBubble day={labels.endOfNextWeek.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickSelect('endofmonth')}
                      onMouseEnter={() => handleDateHover(labels.endOfMonth.date)}
                      onMouseLeave={handleDateHoverEnd}
                      className="w-full flex items-center justify-between text-sm px-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded border border-gray-300 dark:border-gray-600 transition-colors"
                    >
                      <span>{labels.endOfMonth.text}</span>
                      <DayBubble day={labels.endOfMonth.day} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange('');
                        setIsOpen(false);
                      }}
                      className="w-full flex items-center justify-center text-sm px-1 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded border border-orange-600 transition-colors font-semibold"
                    >
                      Clear Snooze
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Right Column: Custom Calendar Picker - Fixed width for calendar */}
            <div className="w-[280px] flex-shrink-0">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 mb-1 px-0.5">Select Date</h3>

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-0.5 px-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                </button>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {getMonthYearString()}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5 text-gray-700 dark:text-gray-300" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-0.5">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                    const colorMap: Record<string, string> = {
                      'Sun': 'bg-pink-500/70',
                      'Mon': 'bg-blue-500/70',
                      'Tue': 'bg-green-500/70',
                      'Wed': 'bg-yellow-500/70',
                      'Thu': 'bg-orange-500/70',
                      'Fri': 'bg-purple-500/70',
                      'Sat': 'bg-red-500/70'
                    };
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-center py-0.5"
                      >
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white ${colorMap[day]}`}
                        >
                          {day.substring(0, 1)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-0.5">
                  {getCalendarDays().map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }

                    const isPast = isDateInPast(day);
                    const isSelected = isSelectedDate(day);
                    const isTodayDate = isToday(day);
                    const isWeekendDay = isWeekend(day);
                    const isHovered = isHoveredDate(day);
                    const isOverdue = isSelectedDateOverdue();

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDateClick(day)}
                        className={`
                          aspect-square flex items-center justify-center text-sm rounded transition-colors
                          ${isPast && !isSelected
                            ? 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800/50'
                            : isWeekendDay && !isSelected
                            ? 'text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-600/50 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                            : !isSelected
                            ? 'text-gray-900 dark:text-gray-100 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                            : ''
                          }
                          ${isSelected && isOverdue
                            ? 'bg-red-500 text-white hover:bg-red-600 ring-2 ring-red-600'
                            : isSelected
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : ''
                          }
                          ${isTodayDate && !isSelected
                            ? 'ring-2 ring-blue-400 dark:ring-blue-500'
                            : ''
                          }
                          ${isHovered && !isSelected
                            ? `ring-2 ${getHoveredDayColor(day)}`
                            : ''
                          }
                        `}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* Today and Clear buttons */}
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setIsOpen(false);
                    }}
                    className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 px-2 py-1"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(formatDate(new Date()));
                      setIsOpen(false);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1 font-medium"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
