import { Card } from "@/components/ui/card";
import { CalendarView } from "./_components/calendar-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getCalendarEvents } from "@/utils/actions/calendar-events";
import { getGoogleCalendarService } from "@/utils/services/google-calendar";

export default async function Dashboard() {
  // Get today's events
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayEvents = await getCalendarEvents(today, tomorrow);

  // Get upcoming events (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const upcomingEvents = await getCalendarEvents(tomorrow, nextWeek);

  // Check calendar integration status
  let isGoogleCalendarConnected = false;
  try {
    await getGoogleCalendarService();
    isGoogleCalendarConnected = true;
  } catch (error) {
    console.error("Google Calendar not connected:", error);
  }

  // Get all events for the calendar view (current month)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthEvents = await getCalendarEvents(monthStart, monthEnd);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary Cards */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Today&apos;s Events</h2>
          {todayEvents.length > 0 ? (
            <ul className="space-y-2">
              {todayEvents.map((event) => (
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
          ) : (
            <p className="text-sm text-muted-foreground">No events scheduled</p>
          )}
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Upcoming Events</h2>
          {upcomingEvents.length > 0 ? (
            <ul className="space-y-2">
              {upcomingEvents.slice(0, 3).map((event) => (
                <li key={event.id} className="text-sm">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    - {event.startTime.toLocaleDateString()}
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
            <p className="text-sm text-muted-foreground">No upcoming events</p>
          )}
        </Card>
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
          <CalendarView events={monthEvents} />
        </Card>
      </div>
    </div>
  );
}
