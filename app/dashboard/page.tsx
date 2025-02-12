import { Card } from "@/components/ui/card";
import { CalendarView } from "./_components/calendar-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { GoogleCalendarConnect } from "./_components/google-calendar-connect";

export default async function Dashboard() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Summary Cards */}
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Today&apos;s Events</h2>
          <p className="text-sm text-muted-foreground">No events scheduled</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Upcoming Events</h2>
          <p className="text-sm text-muted-foreground">No upcoming events</p>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Calendar Integrations</h2>
          <p className="text-sm text-muted-foreground">
            No calendars connected
          </p>
          {/* <Button size="sm" variant="outline" className="mt-4" asChild>

              <Plus className="h-4 w-4 mr-2" />
              Connect Calendar

          </Button> */}
          <GoogleCalendarConnect />
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
          <CalendarView events={[]} />
        </Card>
      </div>
    </div>
  );
}
