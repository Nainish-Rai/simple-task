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

export async function getCalendarEvents(
  start: Date,
  end: Date
): Promise<CalendarEventType[]> {
  const { userId } = await auth();
  console.log("userId", userId);
  if (!userId) throw new Error("Unauthorized");

  // First get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Get local events
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

    // Convert Google events to our format with defensive checks
    const convertedGoogleEvents: GoogleCalendarEvent[] = [];

    if (Array.isArray(googleEvents)) {
      for (const event of googleEvents) {
        if (!event?.id || !event?.start) continue; // Skip invalid events

        const startDateTime = event.start.dateTime || event.start.date;
        const endDateTime = event.end?.dateTime || event.end?.date;

        if (!startDateTime || !endDateTime) continue; // Skip events without valid dates

        convertedGoogleEvents.push({
          id: event.id,
          title: event.summary || "Untitled Event",
          description: event.description || null,
          location: event.location || null,
          startTime: new Date(startDateTime),
          endTime: new Date(endDateTime),
          isAllDay: Boolean(event.start.date),
          status: event.status || "confirmed",
          externalIds: {
            googleEventId: event.id,
            outlookEventId: null,
          },
        });
      }
    }

    console.log(convertedGoogleEvents);

    // Return combined events
    return [...localEvents, ...convertedGoogleEvents];
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    // Return only local events if Google Calendar sync fails
    return localEvents;
  }
}

export async function createCalendarEvent(data: EventFormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Convert form data to calendar event data
  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  // Get MongoDB user ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
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
      description: data.description,
      location: data.location,
      startTime,
      endTime,
      isAllDay: data.isAllDay,
    });

    // Update local event with Google Calendar ID
    await prisma.calendarEvent.update({
      where: { id: localEvent.id },
      data: {
        externalIds: {
          googleEventId: googleEvent.id,
          outlookEventId: null,
        },
      },
      include: {
        reminders: true,
      },
    });
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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get MongoDB user ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

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
          description: data.description,
          location: data.location,
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
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get MongoDB user ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

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
