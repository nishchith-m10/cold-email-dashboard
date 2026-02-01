/**
 * Date Range Picker Content - Calendar UI without trigger button
 * Used by CompactControls for icon-only integration
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  format, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

interface DateRangePickerContentProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

const presets = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DateRangePickerContent({
  startDate,
  endDate,
  onDateChange,
}: DateRangePickerContentProps) {
  const [rangeStart, setRangeStart] = useState<Date | null>(() => parseLocalDate(startDate));
  const [rangeEnd, setRangeEnd] = useState<Date | null>(() => parseLocalDate(endDate));
  const [currentMonth, setCurrentMonth] = useState(() => parseLocalDate(endDate));
  const [selectingStart, setSelectingStart] = useState(true);

  useEffect(() => {
    setRangeStart(parseLocalDate(startDate));
    setRangeEnd(parseLocalDate(endDate));
  }, [startDate, endDate]);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days + 1);
    
    setRangeStart(start);
    setRangeEnd(end);
    setCurrentMonth(end);
    onDateChange(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
  };

  const handleDayClick = (day: Date) => {
    if (selectingStart) {
      setRangeStart(day);
      setRangeEnd(null);
      setSelectingStart(false);
    } else {
      if (rangeStart && isBefore(day, rangeStart)) {
        setRangeEnd(rangeStart);
        setRangeStart(day);
      } else {
        setRangeEnd(day);
      }
      setSelectingStart(true);
      
      const finalStart = rangeStart && isBefore(day, rangeStart) ? day : rangeStart;
      const finalEnd = rangeStart && isBefore(day, rangeStart) ? rangeStart : day;
      
      if (finalStart && finalEnd) {
        onDateChange(
          format(finalStart, 'yyyy-MM-dd'),
          format(finalEnd, 'yyyy-MM-dd')
        );
      }
    }
  };

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startOffset = getDay(monthStart);
  const today = new Date();

  const isInRange = (day: Date) => {
    if (!rangeStart || !rangeEnd) return false;
    return isWithinInterval(day, { start: rangeStart, end: rangeEnd });
  };

  const isRangeStart = (day: Date) => rangeStart && isSameDay(day, rangeStart);
  const isRangeEnd = (day: Date) => rangeEnd && isSameDay(day, rangeEnd);
  const isDisabled = (day: Date) => isAfter(day, today);

  return (
    <div className="flex rounded-xl border border-border bg-surface shadow-lg">
      {/* Presets Sidebar */}
      <div className="w-28 border-r border-border p-2">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
          Quick Select
        </p>
        {presets.map(preset => (
          <button
            key={preset.days}
            onClick={() => handlePreset(preset.days)}
            className="w-full rounded-md px-2 py-1.5 text-left text-xs text-text-secondary transition hover:bg-surface-elevated hover:text-text-primary"
          >
            {preset.label}
          </button>
        ))}
      </div>
      
      {/* Calendar */}
      <div className="w-64 p-3">
        {/* Month Header */}
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={goToPrevMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-elevated"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-text-primary">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition hover:bg-surface-elevated"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Weekday Headers */}
        <div className="mb-1 grid grid-cols-7 text-center">
          {WEEKDAYS.map(day => (
            <span 
              key={day} 
              className="py-1 text-[11px] font-semibold text-text-secondary"
            >
              {day}
            </span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => (
            <span key={`empty-${i}`} className="h-8 w-8" />
          ))}

          {days.map((day) => {
            const disabled = isDisabled(day);
            const inRange = isInRange(day);
            const isStart = isRangeStart(day);
            const isEnd = isRangeEnd(day);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(day)}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center text-sm font-medium transition',
                  'text-text-primary',
                  !isStart && !isEnd && !inRange && 'hover:bg-surface-elevated rounded-full',
                  inRange && !isStart && !isEnd && 'bg-accent-primary/20 text-text-primary',
                  isStart && 'bg-accent-primary text-white rounded-l-full',
                  isStart && !isEnd && 'rounded-r-none',
                  isStart && isEnd && 'rounded-full',
                  isEnd && !isStart && 'bg-accent-primary text-white rounded-r-full rounded-l-none',
                  isToday && !isStart && !isEnd && 'font-bold text-accent-primary',
                  disabled && 'text-text-secondary/40 cursor-not-allowed hover:bg-transparent'
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>

        {/* Selected Range Footer */}
        {rangeStart && rangeEnd && (
          <div className="mt-3 border-t border-border pt-2 text-center">
            <p className="text-xs text-text-secondary">
              {isSameDay(rangeStart, rangeEnd)
                ? format(rangeStart, 'EEEE, MMM d, yyyy')
                : `${format(rangeStart, 'MMM d')} → ${format(rangeEnd, 'MMM d, yyyy')}`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
