import { Suspense } from "react";
import { CalendarView } from "../_components/calendar-view";
import { getCalendarEvents } from "@/utils/actions/calendar-events";

export default async function CalendarPage() {
  // Get events for the current month (we'll implement real-time updates later)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const events = await getCalendarEvents(startOfMonth, endOfMonth);

  return (
    <div className="h-full p-4 space-y-4">
      <Suspense fallback={<div>Loading calendar...</div>}>
        <CalendarView events={events} />
      </Suspense>
    </div>
  );
}
