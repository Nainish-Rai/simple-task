"use client";

import { Card } from "@/components/ui/card";
import { CalendarView } from "./_components/calendar-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useCalendarEvents } from "@/utils/hook/useCalendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { CalendarEventType } from "@/utils/types";

export default function Dashboard() {
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] =
    useState(false);

  // Get today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const { data: todayEvents = [], isLoading: todayLoading } = useCalendarEvents(
    today,
    tomorrow
  );

  // Get upcoming events (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const { data: upcomingEvents = [], isLoading: upcomingLoading } =
    useCalendarEvents(tomorrow, nextWeek);

  // Get all events for the calendar view (current month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const { data: monthEvents = [], isLoading: monthLoading } = useCalendarEvents(
    monthStart,
    monthEnd
  );

  // Check Google Calendar connection status
  useEffect(() => {
    const checkGoogleCalendar = async () => {
      try {
        const response = await fetch("/api/auth/google-calendar/status");
        const { connected } = await response.json();
        setIsGoogleCalendarConnected(connected);
      } catch (error) {
        console.error("Failed to check Google Calendar status:", error);
      }
    };

    checkGoogleCalendar();
  }, []);

  const renderEventList = (events: CalendarEventType[], loading: boolean) => {
    if (loading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );
    }

    if (events.length === 0) {
      return (
        <p className="text-sm text-muted-foreground">No events scheduled</p>
      );
    }

    return (
      <ul className="space-y-2">
        {events.map((event) => (
          <li key={event.id} className="text-sm">
            <span className="font-medium">{event.title}</span>
            {!event.isAllDay && (
              <span className="text-muted-foreground">
                {" "}
                -{" "}
                {event.startTime.toLocaleTimeString([], {
                  timeStyle: "short",
                })}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Events */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Today&apos;s Events</h2>
          {renderEventList(todayEvents, todayLoading)}
        </Card>

        {/* Upcoming Events */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Upcoming Events</h2>
          {upcomingLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : (
            <>
              {upcomingEvents.length > 0 ? (
                <ul className="space-y-2">
                  {upcomingEvents.slice(0, 3).map((event) => (
                    <li key={event.id} className="text-sm">
                      <span className="font-medium">{event.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        -{" "}
                        {new Date(event.startTime).toLocaleDateString(
                          undefined,
                          { day: "2-digit", month: "2-digit", year: "numeric" }
                        )}
                      </span>
                    </li>
                  ))}
                  {upcomingEvents.length > 3 && (
                    <li className="text-sm text-muted-foreground">
                      +{upcomingEvents.length - 3} more events
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming events
                </p>
              )}
            </>
          )}
        </Card>

        {/* Calendar Integrations */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Calendar Integrations</h2>
          {isGoogleCalendarConnected ? (
            <div>
              <p className="text-sm text-green-600 mb-2">
                ✓ Google Calendar connected
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/settings">Manage Integrations</Link>
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                No calendars connected
              </p>
              <Button size="sm" variant="outline" className="mt-2" asChild>
                <Link href="/dashboard/calendar">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Calendar
                </Link>
              </Button>
            </>
          )}
        </Card>
      </div>

      {/* Calendar Widget */}
      <div className="mt-4">
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Calendar</h2>
            <Button variant="outline" asChild>
              <Link href="/dashboard/calendar">View Full Calendar</Link>
            </Button>
          </div>
          {monthLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Skeleton className="h-full w-full" />
            </div>
          ) : (
            <CalendarView events={monthEvents} />
          )}
        </Card>
      </div>
    </div>
  );
}
