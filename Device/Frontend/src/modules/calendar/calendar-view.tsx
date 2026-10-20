'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';

import { ModuleHeader } from '@/components/layout/module-header';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CALENDAR_EVENTS } from '@/data/mock';

export function CalendarView() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const selectedDateStr = date?.toISOString().split('T')[0];
  const dayEvents = CALENDAR_EVENTS.filter((e) => e.date === selectedDateStr);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Calendar & Schedule"
        breadcrumbs={['Home', 'Calendar']}
        backHref="/dashboard"
        icon={<CalendarIcon className="size-5" />}
        iconClassName="bg-info"
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 size-4" />
            New Event
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-soft lg:col-span-1">
          <CardContent className="p-4">
            <Calendar mode="single" selected={date} onSelect={setDate} className="w-full" />
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">
                {date ? date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled for this day.</p>
              ) : (
                dayEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 rounded-xl border border-border/60 px-4 py-3">
                    <div className={`size-2 rounded-full ${event.type === 'deadline' ? 'bg-destructive' : event.type === 'meeting' ? 'bg-primary' : 'bg-info'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" />
                        {event.time}
                      </p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">{event.type}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {CALENDAR_EVENTS.map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{event.title}</span>
                  <span className="text-muted-foreground">{event.date} · {event.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
