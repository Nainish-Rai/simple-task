"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventDialog } from "./event-dialog";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/utils/actions/calendar-events";
import { toast } from "sonner";
import { CalendarEventType, EventFormData } from "@/utils/types";

interface CalendarViewProps {
  events: CalendarEventType[];
}

export function CalendarView({ events = [] }: CalendarViewProps) {
  const [view, setView] = useState<
    "dayGridMonth" | "timeGridWeek" | "timeGridDay"
  >("dayGridMonth");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventType | null>(
    null
  );
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Transform events to FullCalendar format
  const calendarEvents = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime,
    allDay: event.isAllDay,
    extendedProps: {
      description: event.description,
      location: event.location,
      status: event.status,
      // Add source information for different handling
      source:
        "externalIds" in event && event.externalIds?.googleEventId
          ? "google"
          : "local",
      googleEventId:
        "externalIds" in event ? event.externalIds?.googleEventId : null,
    },
  }));

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDates({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
    });
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = events.find((e) => e.id === clickInfo.event.id);
    if (event) {
      setSelectedEvent(event);
      setDialogMode("edit");
      setDialogOpen(true);
    }
  };

  const handleCreateNewEvent = () => {
    setSelectedEvent(null);
    setSelectedDates(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEventSubmit = async (data: EventFormData) => {
    try {
      startTransition(async () => {
        if (dialogMode === "create") {
          await createCalendarEvent(data);
          toast.success("Event created successfully");
        } else if (dialogMode === "edit" && selectedEvent) {
          await updateCalendarEvent(selectedEvent.id, data);
          toast.success("Event updated successfully");
        }
        router.refresh();
        setDialogOpen(false);
      });
    } catch (error) {
      console.error("Failed to save event:", error);
      toast.error("Failed to save event");
    }
  };

  const handleEventDelete = async () => {
    if (!selectedEvent) return;

    try {
      startTransition(async () => {
        await deleteCalendarEvent(selectedEvent.id);
        toast.success("Event deleted successfully");
        router.refresh();
        setDialogOpen(false);
      });
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    }
  };

  return (
    <Card className="p-4 flex-1">
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("dayGridMonth")}
            className={
              view === "dayGridMonth"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("timeGridWeek")}
            className={
              view === "timeGridWeek"
                ? "bg-primary text-primary-foreground"
                : ""
            }
          >
            Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView("timeGridDay")}
            className={
              view === "timeGridDay" ? "bg-primary text-primary-foreground" : ""
            }
          >
            Day
          </Button>
        </div>
        <Button size="sm" onClick={handleCreateNewEvent}>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="mt-4 fc-theme-shadcn">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false} // We're using our custom header
          events={calendarEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          height="auto"
          contentHeight="auto"
          // Additional view-specific options
          views={{
            timeGrid: {
              nowIndicator: true,
              slotMinTime: "06:00:00",
              slotMaxTime: "22:00:00",
            },
          }}
          eventContent={(eventInfo) => {
            const source = eventInfo.event.extendedProps.source;
            return {
              html: `
                <div class="fc-event-main-frame">
                  <div class="fc-event-title-container">
                    <div class="fc-event-title fc-sticky">
                      ${eventInfo.event.title}
                      ${
                        source === "google"
                          ? ' <span style="font-size: 0.75rem;">📅</span>'
                          : ""
                      }
                    </div>
                  </div>
                </div>
              `,
            };
          }}
        />
      </div>

      <EventDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        mode={dialogMode}
        initialData={
          dialogMode === "edit"
            ? selectedEvent
            : selectedDates
            ? {
                startDate: selectedDates.start,
                endDate: selectedDates.end,
                isAllDay: selectedDates.allDay,
              }
            : undefined
        }
        onSubmit={handleEventSubmit}
        onDelete={dialogMode === "edit" ? handleEventDelete : undefined}
      />

      <style jsx global>{`
        /* Custom theme for FullCalendar to match shadcn/ui */
        .fc-theme-shadcn {
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-event-bg-color: hsl(var(--primary));
          --fc-event-border-color: hsl(var(--primary));
          --fc-today-bg-color: hsl(var(--accent) / 0.1);
        }

        .fc {
          background-color: hsl(var(--background));
          border-radius: var(--radius);
        }

        .fc th {
          padding: 0.5rem;
          font-weight: 500;
          color: hsl(var(--foreground));
        }

        .fc td {
          border-color: hsl(var(--border));
        }

        .fc-event {
          border-radius: var(--radius);
          padding: 2px 4px;
          font-size: 0.875rem;
        }

        .fc-day-today {
          background-color: hsl(var(--accent) / 0.1) !important;
        }

        .fc-highlight {
          background-color: hsl(var(--accent) / 0.2) !important;
        }
      `}</style>
    </Card>
  );
}
