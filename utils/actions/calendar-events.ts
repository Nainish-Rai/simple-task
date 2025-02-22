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
  MeetingIntegration,
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

type EnhancedMeetingData = {
  provider: string;
  meetingUrl: string;
  meetingId: string | null;
  password: string | null;
  settings: Record<string, any>;
};

type EventMeetingIntegration = MeetingIntegration & EnhancedMeetingData;

function createMeetingIntegration(
  result: {
    provider: string;
    meetingUrl: string;
    meetingId?: string;
    password?: string;
    settings?: Record<string, any>;
  } | null
): EventMeetingIntegration | null {
  if (!result) return null;

  return {
    provider: result.provider,
    meetingUrl: result.meetingUrl,
    meetingId: result.meetingId ?? null,
    password: result.password ?? null,
    settings: result.settings ?? {},
  } as EventMeetingIntegration;
}

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
        const eventData = {
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
          colorCode: event.colorId ?? null,
          priority: "medium" as EventPriority,
          meetingIntegration:
            event.conferenceData && event.conferenceData.entryPoints?.[0]?.uri
              ? createMeetingIntegration({
                  provider: "google_meet",
                  meetingUrl: event.conferenceData.entryPoints[0].uri,
                  ...(event.conferenceData.conferenceId && {
                    meetingId: event.conferenceData.conferenceId,
                  }),
                })
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

        return eventData as EnhancedEvent;
      }
    );

    const enhancedLocalEvents: EnhancedEvent[] = localEvents.map((event) => ({
      ...event,
      colorCode: null,
      priority: "medium" as EventPriority,
      meetingIntegration: null,
      attachments: [],
      notes: null,
      agendaItems: [],
      comments: [],
      tags: [],
      isPrivate: false,
      category: null,
      notifyChanges: true,
    }));

    const localEventsWithGoogleId = new Map(
      localEvents
        .filter((event) => event.externalIds?.googleEventId)
        .map((event) => [event.externalIds!.googleEventId!, event])
    );

    const uniqueGoogleEvents = convertedGoogleEvents.filter(
      (googleEvent) => !localEventsWithGoogleId.has(googleEvent.id)
    );

    const allEvents = [...enhancedLocalEvents, ...uniqueGoogleEvents];

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
    return localEvents.map((event) => ({
      ...event,
      colorCode: null,
      priority: "medium" as EventPriority,
      meetingIntegration: null,
      attachments: [],
      notes: null,
      agendaItems: [],
      comments: [],
      tags: [],
      isPrivate: false,
      category: null,
      notifyChanges: true,
    }));
  }
}

export async function createCalendarEvent(
  data: EventFormData
): Promise<EnhancedEvent> {
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

  // Create initial event
  const prismaEvent = await prisma.calendarEvent.create({
    data: {
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
    },
    include: {
      reminders: true,
    },
  });

  // Process file uploads if any
  const attachments = data.attachments?.length
    ? await Promise.all(
        (data.attachments as EventFormDataAttachment[]).map(
          async ({ file }) => {
            if (file instanceof File || "arrayBuffer" in file) {
              return FileUploadService.uploadFile(file as File, user.id);
            }
            return file;
          }
        )
      )
    : [];

  // Handle meeting integration
  const meetingIntegration = await (async () => {
    if (!data.meetingType || data.meetingType === "none") return null;

    const result = await MeetingService.createMeeting(
      data.meetingType as "google_meet" | "zoom",
      {
        title: data.title,
        startTime,
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / 60000),
        description: data.description,
      }
    );

    return createMeetingIntegration(result);
  })();

  // Create enhanced event with additional features
  const enhancedEvent: EnhancedEvent = {
    ...prismaEvent,
    colorCode: data.colorCode ?? null,
    priority: data.priority ?? "medium",
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    isPrivate: data.isPrivate ?? false,
    category: data.category ?? null,
    notifyChanges: data.notifyChanges ?? true,
    agendaItems: (data.agendaItems ?? []).map((item) => ({
      title: item.title,
      duration: item.duration || null,
      presenter: item.presenter || null,
      notes: item.notes || null,
      status: item.status,
    })),
    comments: [],
    attachments,
    meetingIntegration,
  };

  // Sync with Google Calendar
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
      const updatedEvent = await prisma.calendarEvent.update({
        where: { id: prismaEvent.id },
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

  // Update base event data
  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: data.title,
      description: data.description || null,
      location: data.location || null,
      startTime,
      endTime,
      isAllDay: data.isAllDay,
      status: "confirmed",
    },
    include: {
      reminders: true,
    },
  });

  // Process file uploads if any
  const attachments = data.attachments?.length
    ? await Promise.all(
        (data.attachments as EventFormDataAttachment[]).map(
          async ({ file }) => {
            if (file instanceof File || "arrayBuffer" in file) {
              return FileUploadService.uploadFile(file as File, user.id);
            }
            return file;
          }
        )
      )
    : [];

  // Handle meeting integration
  const meetingIntegration = await (async () => {
    if (!data.meetingType || data.meetingType === "none") return null;

    const result = await MeetingService.createMeeting(
      data.meetingType as "google_meet" | "zoom",
      {
        title: data.title,
        startTime,
        duration: Math.floor((endTime.getTime() - startTime.getTime()) / 60000),
        description: data.description,
      }
    );

    return createMeetingIntegration(result);
  })();

  // Create enhanced event with additional features
  const enhancedEvent: EnhancedEvent = {
    ...updatedEvent,
    colorCode: data.colorCode ?? null,
    priority: data.priority ?? "medium",
    notes: data.notes ?? null,
    tags: data.tags ?? [],
    isPrivate: data.isPrivate ?? false,
    category: data.category ?? null,
    notifyChanges: data.notifyChanges ?? true,
    agendaItems: (data.agendaItems ?? []).map((item) => ({
      title: item.title,
      duration: item.duration || null,
      presenter: item.presenter || null,
      notes: item.notes || null,
      status: item.status,
    })),
    comments: [],
    attachments,
    meetingIntegration,
  };

  // Update Google Calendar if connected
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
    }
  }

  return enhancedEvent;
}

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
