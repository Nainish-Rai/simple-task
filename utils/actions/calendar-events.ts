"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/mongodb";
import {
  CalendarEventSchema,
  EventFormData,
  CalendarEventType,
  GoogleCalendarEvent,
} from "../types";
import { getGoogleCalendarService } from "../services/google-calendar";
import { calendar_v3 } from "googleapis";

export async function getCalendarEvents(
  start: Date,
  end: Date
): Promise<CalendarEventType[]> {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // First get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Get local events using the MongoDB user ID
  const localEvents = await prisma.calendarEvent.findMany({
    where: {
      userId: user.id,
      startTime: {
        gte: start,
      },
      endTime: {
        lte: end,
      },
    },
    include: {
      reminders: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // Try to get Google Calendar events if connected
  try {
    const googleCalendar = await getGoogleCalendarService();
    const googleEvents = await googleCalendar.listEvents(start, end);

    // Convert Google events to our format
    const convertedGoogleEvents: GoogleCalendarEvent[] = googleEvents.map(
      (
        event: calendar_v3.Schema$Event & {
          calendarId?: string;
          calendarName?: string;
        }
      ) => ({
        id: event.id!,
        title: event.summary || "Untitled Event",
        description: event.description || null,
        location: event.location || null,
        startTime: new Date(event.start?.dateTime || event.start?.date!),
        endTime: new Date(event.end?.dateTime || event.end?.date!),
        isAllDay: Boolean(event.start?.date),
        status: event.status || "confirmed",
        externalIds: {
          googleEventId: event.id!,
          outlookEventId: null,
          calendarId: event.calendarId || "primary",
          calendarName: event.calendarName || "Primary Calendar",
        },
      })
    );

    // Return combined events
    return [...localEvents, ...convertedGoogleEvents];
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    // Return only local events if Google Calendar sync fails
    return localEvents;
  }
}

export async function createCalendarEvent(data: EventFormData) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Convert form data to calendar event data
  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  const eventData = {
    title: data.title,
    description: data.description || null,
    location: data.location || null,
    startTime,
    endTime,
    isAllDay: data.isAllDay,
    userId: user.id,
    status: "confirmed",
    externalIds: null,
    attendees: [],
    recurrence: null,
  };

  // Validate the data
  const validatedData = CalendarEventSchema.parse(eventData);

  // Create local event
  const localEvent = await prisma.calendarEvent.create({
    data: validatedData,
    include: {
      reminders: true,
    },
  });

  // Try to create in Google Calendar if connected
  try {
    const googleCalendar = await getGoogleCalendarService();
    const googleEvent = await googleCalendar.createEvent({
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startTime,
      endTime,
      isAllDay: data.isAllDay,
    });

    if (googleEvent && googleEvent.id) {
      // Update local event with Google Calendar ID
      await prisma.calendarEvent.update({
        where: { id: localEvent.id },
        data: {
          externalIds: {
            googleEventId: googleEvent.id,
            outlookEventId: null,
            calendarId: "primary",
            calendarName: "Primary Calendar",
          },
        },
        include: {
          reminders: true,
        },
      });
    }
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
    // Continue with local event only if Google Calendar sync fails
  }

  return localEvent;
}

export async function updateCalendarEvent(
  eventId: string,
  data: EventFormData
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Verify the event belongs to the user
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId: user.id,
    },
    include: {
      reminders: true,
    },
  });

  if (!existingEvent) {
    throw new Error("Event not found");
  }

  // Convert form data to calendar event data
  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  const eventData = {
    title: data.title,
    description: data.description || null,
    location: data.location || null,
    startTime,
    endTime,
    isAllDay: data.isAllDay,
    userId: user.id,
    status: existingEvent.status,
    externalIds: existingEvent.externalIds,
    attendees: existingEvent.attendees,
    recurrence: existingEvent.recurrence,
  };

  // Validate the data
  const validatedData = CalendarEventSchema.parse(eventData);

  // Update local event
  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: validatedData,
    include: {
      reminders: true,
    },
  });

  // Try to update in Google Calendar if connected
  if (existingEvent.externalIds?.googleEventId) {
    try {
      const googleCalendar = await getGoogleCalendarService();
      await googleCalendar.updateEvent(
        existingEvent.externalIds.googleEventId,
        {
          title: data.title,
          description: data.description || null,
          location: data.location || null,
          startTime,
          endTime,
          isAllDay: data.isAllDay,
        }
      );
    } catch (error) {
      console.error("Failed to update Google Calendar event:", error);
      // Continue with local update if Google Calendar sync fails
    }
  }

  return updatedEvent;
}

export async function deleteCalendarEvent(eventId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Verify the event belongs to the user
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId: user.id,
    },
    include: {
      reminders: true,
    },
  });

  if (!existingEvent) {
    throw new Error("Event not found");
  }

  // Delete from Google Calendar if connected
  if (existingEvent.externalIds?.googleEventId) {
    try {
      const googleCalendar = await getGoogleCalendarService();
      await googleCalendar.deleteEvent(existingEvent.externalIds.googleEventId);
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error);
      // Continue with local deletion if Google Calendar sync fails
    }
  }

  // Delete local event
  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });

  return true;
}
