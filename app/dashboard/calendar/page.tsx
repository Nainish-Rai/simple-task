import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { CalendarView } from "../_components/calendar-view";
import { getCalendarEvents } from "@/utils/actions/calendar-events";
import { GoogleCalendarConnect } from "../_components/google-calendar-connect";
import { prisma } from "@/lib/mongodb";
import { Card } from "@/components/ui/card";
import { CalendarEventType } from "@/utils/types";

export default async function CalendarPage() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Authentication required");
    }

    // First get the user's MongoDB ID
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Check if Google Calendar is connected using the MongoDB user ID
    const googleCalendar = await prisma.calendarAccount.findFirst({
      where: {
        userId: user.id,
        provider: "google",
      },
    });

    // Get events for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const events = (await getCalendarEvents(
      startOfMonth,
      endOfMonth
    )) as CalendarEventType[];

    return (
      <div className="h-full p-4 space-y-4">
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Calendar</h1>
            {!googleCalendar && <GoogleCalendarConnect />}
          </div>
          {googleCalendar && (
            <p className="text-sm text-muted-foreground mt-2">
              Connected to Google Calendar ({googleCalendar.accountEmail})
            </p>
          )}
        </Card>
        <Suspense fallback={<div>Loading calendar...</div>}>
          <CalendarView events={events} />
        </Suspense>
      </div>
    );
  } catch (error) {
    return (
      <div className="h-full p-4">
        <Card className="p-4">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : "Failed to load calendar"}
          </p>
        </Card>
      </div>
    );
  }
}
