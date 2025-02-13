"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { CalendarEventType, EventFormData } from "@/utils/types";
import { EventDialog } from "./event-dialog";
import { createCalendarEvent } from "@/utils/actions/calendar-events";
import "@/app/styles/calendar.css";

interface CalendarViewProps {
  events?: CalendarEventType[]; // Make events optional
}

// Helper function to format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// Helper function to get color class based on event ID or title
function getEventColorClass(event: CalendarEventType): string {
  const colorClasses = [
    "event-color-1",
    "event-color-2",
    "event-color-3",
    "event-color-4",
    "event-color-5",
  ];

  const str = event.id || event.title;
  const hash = str.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % colorClasses.length;
  return colorClasses[index];
}

export function CalendarView({ events = [] }: CalendarViewProps) {
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  const handleCreateEvent = async (data: EventFormData) => {
    try {
      await createCalendarEvent(data);
      setIsEventDialogOpen(false);
      // Refresh events would happen automatically if the page uses React Server Components
    } catch (error) {
      console.error("Failed to create event:", error);
    }
  };

  // Navigation functions
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() - 1);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() - 7);
    } else {
      newDate.setMonth(currentDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === "day") {
      newDate.setDate(currentDate.getDate() + 1);
    } else if (view === "week") {
      newDate.setDate(currentDate.getDate() + 7);
    } else {
      newDate.setMonth(currentDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Generate time slots from 8:00 to 21:00
  const timeSlots = Array.from({ length: 14 }, (_, i) => {
    const hour = i + 8;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  // Get the dates for current view
  const getDates = () => {
    const dates = [];
    const firstDay = new Date(currentDate);

    if (view === "day") {
      return [currentDate];
    } else if (view === "week") {
      // Set to Monday of current week
      firstDay.setDate(firstDay.getDate() - firstDay.getDay() + 1);
      for (let i = 0; i < 5; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        dates.push(date);
      }
    } else {
      // Month view
      firstDay.setDate(1);
      const firstDayOfWeek = firstDay.getDay();
      firstDay.setDate(1 - firstDayOfWeek);

      // Get 6 weeks including the current month
      for (let i = 0; i < 42; i++) {
        const date = new Date(firstDay);
        date.setDate(firstDay.getDate() + i);
        dates.push(date);
      }
    }
    return dates;
  };

  // Helper function to check if an event belongs to a specific day
  const getEventsForDay = (date: Date) => {
    if (!Array.isArray(events)) return []; // Add safety check

    return events.filter((event) => {
      if (!event?.startTime) return false; // Add null check for event properties
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Helper function to position events
  const getEventStyle = (event: CalendarEventType) => {
    const startHour = new Date(event.startTime).getHours();
    const startMinutes = new Date(event.startTime).getMinutes();
    const endHour = new Date(event.endTime).getHours();
    const endMinutes = new Date(event.endTime).getMinutes();

    const baseHour = 8; // Calendar starts at 8:00
    const marginTop = ((startHour - baseHour) * 60 + startMinutes) * (80 / 60); // 80px per hour
    const duration =
      ((endHour - startHour) * 60 + (endMinutes - startMinutes)) * (80 / 60);

    return {
      marginTop: `${marginTop}px`,
      height: `${duration}px`,
    };
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-semibold">Calendar</h1>
          <span className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full">
            Referat deadline: 1h 26m
          </span>
          <Avatar className="w-8 h-8" />
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 rounded-lg border bg-background p-1">
          {["day", "week", "month"].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as "day" | "week" | "month")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={navigatePrevious}
          >
            ←
          </button>
          <span className="text-sm font-medium">
            {view === "month"
              ? currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
              : view === "day"
              ? currentDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : (() => {
                  const weekStart = new Date(currentDate);
                  weekStart.setDate(
                    weekStart.getDate() - weekStart.getDay() + 1
                  );
                  const weekEnd = new Date(weekStart);
                  weekEnd.setDate(weekStart.getDate() + 4);
                  return `${weekStart.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })} - ${weekEnd.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}`;
                })()}
          </span>
          <button
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={navigateNext}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        {view === "month" ? (
          <div className="grid grid-cols-7 gap-px bg-border">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div key={day} className="p-2 text-sm font-medium bg-background">
                {day}
              </div>
            ))}
            {getDates().map((date, index) => {
              const dayEvents = getEventsForDay(date);
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 m-[1px] bg-background ${
                    isCurrentMonth ? "" : "text-muted-foreground bg-neutral-900"
                  }`}
                >
                  <span className="text-sm">{date.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={`px-2 py-1 text-xs rounded-md ${getEventColorClass(
                          event
                        )} truncate`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex">
            {/* Time Labels */}
            <div className="w-16 flex-shrink-0 border-r">
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="h-20 border-b text-xs text-muted-foreground p-2"
                >
                  {time}
                </div>
              ))}
            </div>

            {/* Calendar Content */}
            <div
              className={`flex-1 grid ${
                view === "day" ? "grid-cols-1" : "grid-cols-5"
              } gap-px bg-border`}
            >
              {getDates().map((date, index) => {
                const dayEvents = getEventsForDay(date);
                return (
                  <div key={index} className="relative bg-background">
                    <div className="p-2 text-sm font-medium border-b sticky top-0 bg-background">
                      {date.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`absolute left-0 right-0 mx-1 p-2 rounded-md text-xs ${getEventColorClass(
                          event
                        )}`}
                        style={getEventStyle(event)}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div>
                          {formatTime(new Date(event.startTime))} -{" "}
                          {formatTime(new Date(event.endTime))}
                        </div>
                        {event.location && <div>{event.location}</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Event Button */}
      <Button
        className="fixed bottom-6 right-6 shadow-lg"
        onClick={() => setIsEventDialogOpen(true)}
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        Create event
      </Button>

      {/* Event Dialog */}
      <EventDialog
        isOpen={isEventDialogOpen}
        onClose={() => setIsEventDialogOpen(false)}
        mode="create"
        onSubmit={handleCreateEvent}
      />
    </div>
  );
}
