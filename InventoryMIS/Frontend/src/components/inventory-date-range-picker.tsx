'use client';

import { useState } from 'react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface InventoryDateRange {
  from?: Date;
  to?: Date;
}

interface InventoryDateRangePickerProps {
  value: InventoryDateRange;
  onChange: (range: InventoryDateRange) => void;
  className?: string;
  placeholder?: string;
}

export function InventoryDateRangePicker({
  value,
  onChange,
  className,
  placeholder = 'Filter by date',
}: InventoryDateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label =
    value.from && value.to
      ? `${format(value.from, 'dd MMM yyyy')} – ${format(value.to, 'dd MMM yyyy')}`
      : value.from
        ? `From ${format(value.from, 'dd MMM yyyy')}`
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              'input flex h-11 min-w-[200px] items-center justify-between gap-2 px-3 py-2 text-left text-sm',
              !value.from && 'text-slate-400',
              className
            )}
          />
        }
      >
        <span className="inline-flex min-w-0 items-center gap-2 truncate">
          <CalendarIcon size={16} className="shrink-0 text-[#fcb038]" />
          <span className="truncate">{label}</span>
        </span>
        {value.from || value.to ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange({});
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange({});
              }
            }}
            className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear dates"
          >
            <X size={14} />
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: value.from, to: value.to } as DateRange}
          onSelect={(range) => onChange({ from: range?.from, to: range?.to })}
          numberOfMonths={1}
          defaultMonth={value.from}
        />
        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-3 py-2">
          <button
            type="button"
            className="text-xs font-medium text-slate-500 hover:text-[#000435]"
            onClick={() => onChange({})}
          >
            Clear
          </button>
          <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={() => setOpen(false)}>
            Apply
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function isWithinDateRange(isoDate: string, range: InventoryDateRange): boolean {
  if (!range.from && !range.to) return true;
  const date = new Date(isoDate);
  if (range.from && isBefore(date, startOfDay(range.from))) return false;
  if (range.to && isAfter(date, endOfDay(range.to))) return false;
  return true;
}
