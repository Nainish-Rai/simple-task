"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventDialog } from "./event-dialog";
import { DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarEventData, EventFormData } from "@/utils/types";
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useCalendarEvents,
} from "@/utils/hook/useCalendar";

// Colors cache to prevent recalculation
const colorCache = new Map<string, { background: string; border: string }>();

// Generate pastel color based on event title
const generatePastelColor = (str: string) => {
  if (colorCache.has(str)) {
    return colorCache.get(str)!;
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;
  const s = 65 + (hash % 20);
  const l = 85 + (hash % 10);

  const colors = {
    background: `hsl(${h}, ${s}%, ${l}%)`,
    border: `hsl(${h}, ${s}%, ${l - 15}%)`,
  };

  colorCache.set(str, colors);
  return colors;
};

interface CalendarViewProps {}

export function CalendarView({}: CalendarViewProps) {
  const [view, setView] = useState<
    "dayGridMonth" | "timeGridWeek" | "timeGridDay"
  >("dayGridMonth");
  const [currentViewTitle, setCurrentViewTitle] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start, end };
  });

  const { data: events = [], isLoading } = useCalendarEvents(
    dateRange.start,
    dateRange.end
  );

  const calendarRef = useRef<FullCalendar | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventData | null>(
    null
  );
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  const router = useRouter();

  const createEventMutation = useCreateEvent();
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

  // Memoized calendar events transformation
  const calendarEvents = useMemo(
    () =>
      events.map((event) => {
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
            googleEventId: isGoogleEvent
              ? event.externalIds?.googleEventId
              : null,
            calendarName: isGoogleEvent
              ? event.externalIds?.calendarName
              : "Local Calendar",
          },
        };
      }),
    [events]
  );

  const handleDateSelect = useCallback((selectInfo: DateSelectArg) => {
    setSelectedDates({
      start: selectInfo.start,
      end: selectInfo.end,
      allDay: selectInfo.allDay,
    });
    setDialogMode("create");
    setDialogOpen(true);
  }, []);

  const handleEventClick = useCallback(
    (clickInfo: EventClickArg) => {
      const event = events.find((e) => e.id === clickInfo.event.id);
      if (event) {
        setSelectedEvent(event);
        setDialogMode("edit");
        setDialogOpen(true);
      }
    },
    [events]
  );

  const handleCreateNewEvent = useCallback(() => {
    setSelectedEvent(null);
    setSelectedDates(null);
    setDialogMode("create");
    setDialogOpen(true);
  }, []);

  const handleEventSubmit = useCallback(
    async (data: EventFormData) => {
      try {
        if (dialogMode === "create") {
          await createEventMutation.mutateAsync(data);
          toast.success("Event created successfully");
        } else if (dialogMode === "edit" && selectedEvent) {
          await updateEventMutation.mutateAsync({
            eventId: selectedEvent.id,
            data,
          });
          toast.success("Event updated successfully");
        }
        router.refresh();
        setDialogOpen(false);
      } catch (error) {
        console.error("Failed to save event:", error);
        toast.error("Failed to save event");
      }
    },
    [
      dialogMode,
      selectedEvent,
      createEventMutation,
      updateEventMutation,
      router,
    ]
  );

  const handleEventDelete = useCallback(async () => {
    if (!selectedEvent) return;

    try {
      await deleteEventMutation.mutateAsync(selectedEvent.id);
      toast.success("Event deleted successfully");
      router.refresh();
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to delete event:", error);
      toast.error("Failed to delete event");
    }
  }, [selectedEvent, deleteEventMutation, router]);

  // Memoized event content renderer
  const renderEventContent = useCallback((eventInfo: any) => {
    const title = eventInfo.event.title;
    const room = eventInfo.event.extendedProps.location || "";
    const colors = generatePastelColor(title);

    return {
      html: `
        <div class="fc-event-main-frame" style="background-color: ${
          colors.background
        }; border-left: 3px solid ${colors.border}; border-radius: 4px;">
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
  }, []);

  return (
    <div className="p-1 flex-1">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-semibold">Calendar</h1>
          <div className="flex items-center gap-6">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                ←
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => calendarRef.current?.getApi().today()}
              >
                Today
              </Button>
              <span className="text-sm font-medium min-w-[150px] text-center">
                {currentViewTitle}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => calendarRef.current?.getApi().next()}
              >
                →
              </Button>
            </div>
            {/* View Toggle Buttons */}
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
        </div>
        <div className="flex items-center gap-4">
          <Button
            size="sm"
            onClick={handleCreateNewEvent}
            className="fixed z-10 bottom-0 mb-2 rounded-lg right-2 dark:bg-white dark:text-black bg-black text-white hover:bg-black/90"
            disabled={createEventMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create event
          </Button>
        </div>
      </header>

      <div className="mt-4 fc-theme-shadcn">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          ref={calendarRef}
          headerToolbar={false}
          events={calendarEvents}
          editable={true}
          selectable={true}
          selectMirror={true}
          dayMaxEvents={true}
          weekends={true}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={({ event, revert }) => {
            const originalEvent = events.find((e) => e.id === event.id);
            if (!originalEvent) return;

            const start = event.start!;
            const end = event.end || event.start!;

            // Create updated event data according to EventFormSchema
            const updatedData: EventFormData = {
              title: originalEvent.title,
              description: originalEvent.description || "",
              location: originalEvent.location || "",
              startDate: start,
              endDate: end,
              startTime: event.allDay
                ? "00:00"
                : `${start.getHours().toString().padStart(2, "0")}:${start
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`,
              endTime: event.allDay
                ? "23:59"
                : `${end.getHours().toString().padStart(2, "0")}:${end
                    .getMinutes()
                    .toString()
                    .padStart(2, "0")}`,
              isAllDay: event.allDay,
              meetingType: "none",
              attachments: [],
              tags: [],
              notes: "",
              agendaItems: [],
              isPrivate: false,
              category: "",
              notifyChanges: true,
              priority: "medium",
              colorCode: "",
            };

            // Update the event in the backend
            updateEventMutation
              .mutateAsync({
                eventId: event.id,
                data: updatedData,
              })
              .then(() => {
                toast.success("Event updated successfully");
                router.refresh();
              })
              .catch(() => {
                toast.error("Failed to update event");
                revert();
              });
          }}
          height="auto"
          contentHeight="auto"
          slotMinTime="08:00:00"
          slotMaxTime="20:00:00"
          slotDuration="00:30:00"
          nowIndicator={true}
          slotLabelFormat={{
            hour: "2-digit" as const,
            minute: "2-digit" as const,
            hour12: false,
          }}
          slotLabelClassNames="text-xs text-gray-500"
          dayHeaderClassNames="text-md font-medium"
          eventClassNames="rounded-3xl! bg-black border-none px-0!"
          allDayClassNames="text-xs"
          slotLaneClassNames="border-gray-100"
          datesSet={(dateInfo) => {
            setView(
              dateInfo.view.type as
                | "dayGridMonth"
                | "timeGridWeek"
                | "timeGridDay"
            );
            setCurrentViewTitle(dateInfo.view.title);
            setDateRange({
              start: dateInfo.start,
              end: dateInfo.end,
            });
          }}
          eventContent={renderEventContent}
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
        isLoading={
          createEventMutation.isPending ||
          updateEventMutation.isPending ||
          deleteEventMutation.isPending
        }
      />

      <style jsx global>{`
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

        .fc-timeGridWeek-view .fc-col-header-cell {
          padding: 0.5rem;
        }

        .fc-timeGridDay-view .fc-col-header-cell {
          padding: 0.75rem;
        }

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
    </div>
  );
}
