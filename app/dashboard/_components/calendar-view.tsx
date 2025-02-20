"use client";

import { useState, useRef } from "react";
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

  const calendarRef = useRef<FullCalendar | null>(null);

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

  // Helper function to get calendar name
  const getCalendarName = (event: CalendarEventType): string => {
    if ("externalIds" in event && event.externalIds?.calendarName) {
      return event.externalIds.calendarName;
    }
    return "Local Calendar";
  };

  // Transform events to FullCalendar format
  const calendarEvents = events.map((event) => {
    const isGoogleEvent =
      "externalIds" in event && event.externalIds?.googleEventId;
    return {
      id: event.id,
      title: event.title,
      start: event.startTime,
      end: event.endTime,
      allDay: event.isAllDay,
      extendedProps: {
        description: event.description,
        location: event.location,
        status: event.status,
        source: isGoogleEvent ? "google" : "local",
        googleEventId: isGoogleEvent ? event.externalIds?.googleEventId : null,
        calendarName: isGoogleEvent
          ? event.externalIds?.calendarName
          : "Local Calendar",
      },
    };
  });

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
    <Card className="p-6 flex-1">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <div className="flex gap-1 dark:bg-background border bg-gray-100 p-1 rounded-lg">
            <Button
              variant={view === "dayGridMonth" ? "default" : "ghost"}
              size="sm"
              className={
                view === "dayGridMonth"
                  ? "bg-white/90 shadow-sm"
                  : "hover:bg-white/50"
              }
              onClick={() => {
                calendarRef.current?.getApi().changeView("dayGridMonth");
                setView("dayGridMonth");
              }}
            >
              Month
            </Button>
            <Button
              variant={view === "timeGridWeek" ? "default" : "ghost"}
              size="sm"
              className={
                view === "timeGridWeek"
                  ? "bg-white shadow-sm"
                  : "hover:bg-white/50"
              }
              onClick={() => {
                calendarRef.current?.getApi().changeView("timeGridWeek");
                setView("timeGridWeek");
              }}
            >
              Week
            </Button>
            <Button
              variant={view === "timeGridDay" ? "default" : "ghost"}
              size="sm"
              className={
                view === "timeGridDay"
                  ? "bg-white shadow-sm"
                  : "hover:bg-white/50"
              }
              onClick={() => {
                calendarRef.current?.getApi().changeView("timeGridDay");
                setView("timeGridDay");
              }}
            >
              Day
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-red-500">Referat deadline: 1h 26m</span>
          <Button
            size="sm"
            onClick={handleCreateNewEvent}
            className="fixed z-10 bottom-0 mb-2 rounded-lg right-2 dark:bg-white dark:text-black bg-black text-white hover:bg-black/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create event
          </Button>
        </div>
      </div>

      <div className="mt-4 fc-theme-shadcn">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          ref={calendarRef}
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
              slotMinTime: "08:00:00",
              slotMaxTime: "20:00:00",
              slotDuration: "00:30:00",
              slotLabelFormat: {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              },
            },
          }}
          slotLabelClassNames="text-xs  text-gray-500"
          dayHeaderClassNames="text-md font-medium"
          eventClassNames="rounded-3xl! bg-black border-none px-0! "
          allDayClassNames="text-xs"
          slotLaneClassNames="border-gray-100"
          // Add this prop to handle view changes
          datesSet={(dateInfo) => {
            setView(
              dateInfo.view.type as
                | "dayGridMonth"
                | "timeGridWeek"
                | "timeGridDay"
            );
          }}
          eventContent={(eventInfo) => {
            const title = eventInfo.event.title;
            const room = eventInfo.event.extendedProps.location || "";

            // Generate pastel color based on event title
            const generatePastelColor = (str: string) => {
              let hash = 0;
              for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
              }

              // Generate HSL values for pastel colors
              const h = hash % 360; // Any hue
              const s = 65 + (hash % 20); // Saturation between 65-85%
              const l = 85 + (hash % 10); // Lightness between 85-95%

              return {
                background: `hsl(${h}, ${s}%, ${l}%)`,
                border: `hsl(${h}, ${s}%, ${l - 15}%)`,
              };
            };

            const colors = generatePastelColor(title);

            return {
              html: `
                <div class="fc-event-main-frame" style="background-color: ${
                  colors.background
                }; border-left: 3px solid ${
                colors.border
              }; border-radius: 4px;">
                  <div class="fc-event-title-container">
                    <div class="fc-event-title fc-sticky" style="color: #4b5563; padding: 4px 6px;">
                      ${title}
                      ${
                        room
                          ? `<div style="font-size: 0.75rem; opacity: 0.7;">${room}</div>`
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
          --fc-event-title-color: hsl(var(--background));
          --fc-border-color: hsl(var(--border));
          --fc-button-bg-color: hsl(var(--primary));
          --fc-button-border-color: hsl(var(--primary));
          --fc-button-hover-bg-color: hsl(var(--primary) / 0.9);
          --fc-button-hover-border-color: hsl(var(--primary) / 0.9);
          --fc-button-active-bg-color: hsl(var(--primary) / 0.8);
          --fc-button-active-border-color: hsl(var(--primary) / 0.8);
          --fc-today-bg-color: hsl(var(--accent) / 0.1);
          --fc-page-bg-color: hsl(var(--background));
          --fc-neutral-bg-color: hsl(var(--background));
          --fc-list-event-hover-bg-color: hsl(var(--accent) / 0.1);
        }

        .fc {
          background-color: hsl(var(--background));
          border-radius: var(--radius);
        }

        .fc th {
          padding: 0.5rem;
          font-weight: 500;
        }

        .fc td {
          border-color: hsl(var(--border));
          background-color: hsl(var(--background));
        }

        .fc-event {
          font-size: 0.8rem;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: transform 0.1s ease;
        }

        .fc-event-title {
          padding: 0.25rem 0.5rem;
          color: hsl(var(--background));
        }

        .fc-event:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .fc-day-today {
          background-color: hsl(var(--accent) / 0.1) !important;
        }

        .fc-highlight {
          background-color: hsl(var(--accent) / 0.2) !important;
        }

        .fc-daygrid-day-number,
        .fc-col-header-cell-cushion {
          color: hsl(var(--foreground));
        }

        /* Time grid specific styles */
        .fc-timegrid-slot-label {
          color: hsl(var(--foreground) / 0.8);
          font-size: 0.875rem;
        }

        .fc-timegrid-axis {
          border-color: hsl(var(--border));
        }

        .fc-timegrid-slot {
          height: 3rem !important;
        }

        .fc-timegrid-event {
          border-radius: var(--radius);
          margin: 1px;
        }

        /* Week view specific */
        .fc-timeGridWeek-view .fc-col-header-cell {
          padding: 0.5rem;
        }

        /* Day view specific */
        .fc-timeGridDay-view .fc-col-header-cell {
          padding: 0.75rem;
        }

        /* General improvements */
        .fc-scrollgrid {
          border-radius: var(--radius);
        }

        .fc-scrollgrid-section > td {
          border-color: hsl(var(--border));
        }

        .fc-view {
          background: hsl(var(--background));
        }
      `}</style>
    </Card>
  );
}
