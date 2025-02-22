"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/mongodb";
import {
  CalendarEventSchema,
  EventFormData,
  CalendarEventType,
  GoogleCalendarEvent,
  UploadedFile,
  EventFormDataAttachment,
  EventPriority,
  Reminder,
} from "../types";
import {
  EventWithReminders,
  EnhancedEvent,
  TempEventData,
} from "../action-types";
import { getGoogleCalendarService } from "../services/google-calendar";
import { FileUploadService } from "../services/file-upload";
import { MeetingService } from "../services/meeting-service";
import { validateCalendarSync } from "../services/sync-validation";
import { calendar_v3 } from "googleapis";

export async function getCalendarEvents(
  start: Date,
  end: Date
): Promise<EnhancedEvent[]> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Get base event data
  const localEvents = await prisma.calendarEvent.findMany({
    where: {
      userId: user.id,
      startTime: { gte: start },
      endTime: { lte: end },
    },
    include: {
      reminders: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  try {
    const googleCalendar = await getGoogleCalendarService();
    const googleEvents = await googleCalendar.listEvents(start, end);

    const convertedGoogleEvents: EnhancedEvent[] = googleEvents.map(
      (
        event: calendar_v3.Schema$Event & {
          calendarId?: string;
          calendarName?: string;
        }
      ) => {
        const baseData: EventWithReminders = {
          id: event.id!,
          userId: user.id,
          title: event.summary || "Untitled Event",
          description: event.description ?? null,
          location: event.location ?? null,
          startTime: new Date(
            event.start?.dateTime || event.start?.date || new Date()
          ),
          endTime: new Date(
            event.end?.dateTime || event.end?.date || new Date()
          ),
          isAllDay: Boolean(event.start?.date),
          status: event.status || "confirmed",
          externalIds: {
            googleEventId: event.id!,
            outlookEventId: null,
            calendarId: event.calendarId ?? "primary",
            calendarName: event.calendarName ?? "Primary Calendar",
          },
          recurrence: null,
          attendees:
            event.attendees?.map((a) => ({
              email: a.email!,
              name: a.displayName ?? null,
              response: a.responseStatus ?? null,
            })) || [],
          createdAt: new Date(event.created || new Date()),
          updatedAt: new Date(event.updated || new Date()),
          reminders: [
            {
              id: `temp-${event.id}`,
              eventId: event.id!,
              reminderType: "notification",
              minutesBefore: 30,
              status: "pending",
              createdAt: new Date(),
            },
          ],
        };

        const enhancedData: Partial<TempEventData> = {
          colorCode: event.colorId ?? null,
          priority: "medium" as EventPriority,
          meetingIntegration: event.conferenceData
            ? {
                provider: "google_meet",
                meetingUrl: event.conferenceData.entryPoints?.[0]?.uri || "",
                meetingId: event.conferenceData.conferenceId || undefined,
                settings: {},
              }
            : null,
          attachments: [],
          notes: null,
          agendaItems: [],
          comments: [],
          tags: [],
          isPrivate: false,
          category: null,
          notifyChanges: true,
        };

        const enhancedEvent: EnhancedEvent = {
          ...baseData,
          ...enhancedData,
        };

        return enhancedEvent;
      }
    );

    const localEventsWithGoogleId = new Map(
      localEvents
        .filter((event) => event.externalIds?.googleEventId)
        .map((event) => [event.externalIds!.googleEventId!, event])
    );

    const uniqueGoogleEvents = convertedGoogleEvents.filter(
      (googleEvent) => !localEventsWithGoogleId.has(googleEvent.id)
    );

    const allEvents = [...localEvents, ...uniqueGoogleEvents];

    const { status } = await validateCalendarSync(userId, start, end, {
      fixDiscrepancies: true,
      logResults: true,
    });

    if (status === "out_of_sync") {
      console.warn("Calendar sync validation detected and fixed discrepancies");
    }

    return allEvents;
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    return localEvents;
  }
}

export async function createCalendarEvent(data: EventFormData) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  // Prepare base event data
  const baseData: EventWithReminders = {
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
    reminders: [], // Will be created after the event
    id: "", // Will be set by the database
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Prepare enhanced features data
  const enhancedData: Partial<TempEventData> = {
    colorCode: data.colorCode ?? null,
    priority: data.priority ?? ("medium" as EventPriority),
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    isPrivate: data.isPrivate ?? false,
    category: data.category ?? null,
    notifyChanges: data.notifyChanges ?? true,
    agendaItems: data.agendaItems ?? [],
    comments: [],
    attachments: [],
  };

  // Process file uploads
  if (data.attachments?.length) {
    enhancedData.attachments = await Promise.all(
      (data.attachments as EventFormDataAttachment[]).map(async ({ file }) => {
        if (file instanceof File || "arrayBuffer" in file) {
          return FileUploadService.uploadFile(file as File, user.id);
        }
        return file;
      })
    );
  }

  // Set up meeting integration if requested
  if (data.meetingType && data.meetingType !== "none") {
    enhancedData.meetingIntegration = await MeetingService.createMeeting(
      data.meetingType as "google_meet" | "zoom",
      {
        title: data.title,
        startTime,
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / 60000),
        description: data.description,
      }
    );
  }

  // Create local event with base data
  const localEvent = await prisma.calendarEvent.create({
    data: {
      title: baseData.title,
      description: baseData.description,
      location: baseData.location,
      startTime: baseData.startTime,
      endTime: baseData.endTime,
      isAllDay: baseData.isAllDay,
      userId: baseData.userId,
      status: baseData.status,
      externalIds: baseData.externalIds,
      attendees: baseData.attendees,
      recurrence: baseData.recurrence,
    },
    include: {
      reminders: true,
    },
  });

  // Return combined event with enhanced features
  const enhancedEvent: EnhancedEvent = {
    ...localEvent,
    ...enhancedData,
  };

  // Try to sync with Google Calendar
  try {
    const googleCalendar = await getGoogleCalendarService();
    const googleEvent = await googleCalendar.createEvent({
      title: baseData.title,
      description: baseData.description,
      location: baseData.location,
      startTime: baseData.startTime,
      endTime: baseData.endTime,
      isAllDay: baseData.isAllDay,
    });

    if (googleEvent && googleEvent.id) {
      const updatedEvent = await prisma.calendarEvent.update({
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

      // Update the enhancedEvent with new externalIds
      enhancedEvent.externalIds = updatedEvent.externalIds;
    }
  } catch (error) {
    console.error("Failed to create Google Calendar event:", error);
  }

  return enhancedEvent;
}

export async function updateCalendarEvent(
  eventId: string,
  data: EventFormData
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId: user.id,
    },
    include: {
      reminders: true,
    },
  });

  if (!existingEvent) throw new Error("Event not found");

  // Delete Google Calendar event if connected
  if (existingEvent.externalIds?.googleEventId) {
    try {
      const googleCalendar = await getGoogleCalendarService();
      await googleCalendar.deleteEvent(existingEvent.externalIds.googleEventId);
    } catch (error) {
      console.error("Failed to delete Google Calendar event:", error);
    }
  }

  // Delete the event from the database
  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });

  return true;
}
): Promise<EnhancedEvent> {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  // Get existing event
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId: user.id,
    },
    include: {
      reminders: true,
    },
  });

  if (!existingEvent) throw new Error("Event not found");

  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");
    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  // Prepare base event data
  const baseData: EventWithReminders = {
    ...existingEvent,
    title: data.title,
    description: data.description || null,
    location: data.location || null,
    startTime,
    endTime,
    isAllDay: data.isAllDay,
  };

  // Prepare enhanced features data
  const enhancedData: Partial<TempEventData> = {
    colorCode: data.colorCode ?? null,
    priority: data.priority ?? ("medium" as EventPriority),
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    isPrivate: data.isPrivate ?? false,
    category: data.category ?? null,
    notifyChanges: data.notifyChanges ?? true,
    agendaItems: data.agendaItems ?? [],
    comments: [],
    attachments: [],
  };

  // Process file uploads
  if (data.attachments?.length) {
    enhancedData.attachments = await Promise.all(
      (data.attachments as EventFormDataAttachment[]).map(async ({ file }) => {
        if (file instanceof File || "arrayBuffer" in file) {
          return FileUploadService.uploadFile(file as File, user.id);
        }
        return file;
      })
    );
  }

  // Update meeting integration
  if (data.meetingType && data.meetingType !== "none") {
    enhancedData.meetingIntegration = await MeetingService.createMeeting(
      data.meetingType as "google_meet" | "zoom",
      {
        title: data.title,
        startTime,
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / 60000),
        description: data.description,
      }
    );
  }

  // Update local event with base data
  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: baseData.title,
      description: baseData.description,
      location: baseData.location,
      startTime: baseData.startTime,
      endTime: baseData.endTime,
      isAllDay: baseData.isAllDay,
      status: baseData.status,
    },
    include: {
      reminders: true,
    },
  });

  // Create enhanced event
  const enhancedEvent: EnhancedEvent = {
    ...updatedEvent,
    ...enhancedData,
  };

  // Update Google Calendar if connected
  if (existingEvent.externalIds?.googleEventId) {
    try {
      const googleCalendar = await getGoogleCalendarService();
      await googleCalendar.updateEvent(
        existingEvent.externalIds.googleEventId,
        {
          title: baseData.title,
          description: baseData.description,
          location: baseData.location,
          startTime: baseData.startTime,
          endTime: baseData.endTime,
          isAllDay: baseData.isAllDay,
        }
      );
    } catch (error) {
      console.error("Failed to update Google Calendar event:", error);
    }
  }

  return enhancedEvent;
}
