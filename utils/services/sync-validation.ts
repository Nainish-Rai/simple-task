import { prisma } from "@/lib/mongodb";
import { getGoogleCalendarService } from "./google-calendar";
import { CalendarEventType, GoogleCalendarEvent } from "../types";
import { calendar_v3 } from "googleapis";

export interface SyncValidationResult {
  status: "synced" | "out_of_sync";
  localOnly: CalendarEventType[];
  googleOnly: GoogleCalendarEvent[];
  mismatched: Array<{
    local: CalendarEventType;
    google: GoogleCalendarEvent;
    differences: string[];
  }>;
  errors?: string[];
}

export interface ValidationOptions {
  fixDiscrepancies?: boolean;
  logResults?: boolean;
}

export async function validateCalendarSync(
  userId: string,
  startDate: Date,
  endDate: Date,
  options: ValidationOptions = {}
): Promise<SyncValidationResult> {
  const result: SyncValidationResult = {
    status: "synced",
    localOnly: [],
    googleOnly: [],
    mismatched: [],
    errors: [],
  };

  try {
    // Get user's MongoDB ID
    const user = await prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get local events
    const localEvents = await prisma.calendarEvent.findMany({
      where: {
        userId: user.id,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        reminders: true,
      },
    });

    // Get Google Calendar events and transform to our format
    const googleCalendar = await getGoogleCalendarService();
    const rawGoogleEvents = await googleCalendar.listEvents(startDate, endDate);

    // Transform Google Calendar events to match our interface
    const googleEvents: GoogleCalendarEvent[] = rawGoogleEvents
      .filter(
        (
          event
        ): event is calendar_v3.Schema$Event & {
          id: string;
          summary: string;
        } => Boolean(event.id && event.summary)
      )
      .map((event) => {
        // Type assertion for extended properties from our service
        const extendedEvent = event as calendar_v3.Schema$Event & {
          calendarId?: string;
          calendarName?: string;
        };

        return {
          id: event.id,
          title: event.summary,
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
            googleEventId: event.id,
            outlookEventId: null,
            calendarId: extendedEvent.calendarId ?? "primary",
            calendarName: extendedEvent.calendarName ?? "Primary Calendar",
          },
        };
      });

    // Create lookup maps for easier comparison
    const localEventMap = new Map(
      localEvents.map((event) => [
        event.externalIds?.googleEventId || event.id,
        event,
      ])
    );
    const googleEventMap = new Map(
      googleEvents.map((event) => [event.id, event])
    );

    // Find events that exist only in local database
    localEvents.forEach((local) => {
      const googleId = local.externalIds?.googleEventId;
      if (googleId && !googleEventMap.has(googleId)) {
        result.localOnly.push(local);
      }
    });

    // Find events that exist only in Google Calendar
    googleEvents.forEach((google) => {
      const localEvent = localEventMap.get(google.id);
      if (!localEvent) {
        result.googleOnly.push(google);
      }
    });

    // Compare events that exist in both systems
    localEvents.forEach((local) => {
      const googleId = local.externalIds?.googleEventId;
      if (!googleId) return;

      const google = googleEventMap.get(googleId);
      if (!google) return;

      const differences = compareEvents(local, google);
      if (differences.length > 0) {
        result.mismatched.push({
          local,
          google,
          differences,
        });
      }
    });

    // Set final status
    if (
      result.localOnly.length > 0 ||
      result.googleOnly.length > 0 ||
      result.mismatched.length > 0
    ) {
      result.status = "out_of_sync";
    }

    // Fix discrepancies if requested
    if (options.fixDiscrepancies) {
      await fixSyncDiscrepancies(result, user.id);
    }

    // Log results if requested
    if (options.logResults) {
      logSyncResults(result);
    }
  } catch (error) {
    result.status = "out_of_sync";
    result.errors?.push(
      error instanceof Error ? error.message : "Unknown error"
    );
  }

  return result;
}

function compareEvents(
  local: CalendarEventType,
  google: GoogleCalendarEvent
): string[] {
  const differences: string[] = [];

  // Compare basic fields
  if (local.title !== google.title) {
    differences.push("title");
  }
  if (local.description !== google.description) {
    differences.push("description");
  }
  if (local.location !== google.location) {
    differences.push("location");
  }
  if (local.isAllDay !== google.isAllDay) {
    differences.push("isAllDay");
  }

  // Compare dates considering timezone
  const localStart = new Date(local.startTime).getTime();
  const googleStart = new Date(google.startTime).getTime();
  if (Math.abs(localStart - googleStart) > 1000) {
    // 1 second tolerance
    differences.push("startTime");
  }

  const localEnd = new Date(local.endTime).getTime();
  const googleEnd = new Date(google.endTime).getTime();
  if (Math.abs(localEnd - googleEnd) > 1000) {
    // 1 second tolerance
    differences.push("endTime");
  }

  return differences;
}

async function fixSyncDiscrepancies(
  result: SyncValidationResult,
  userId: string
): Promise<void> {
  const googleCalendar = await getGoogleCalendarService();

  // Handle events that only exist locally
  for (const localEvent of result.localOnly) {
    if (localEvent.externalIds?.googleEventId) {
      // Event was deleted from Google, delete locally
      await prisma.calendarEvent.delete({
        where: { id: localEvent.id },
      });
    } else {
      // Event needs to be created in Google
      const googleEvent = await googleCalendar.createEvent({
        title: localEvent.title,
        description: localEvent.description ?? null,
        location: localEvent.location ?? null,
        startTime: localEvent.startTime,
        endTime: localEvent.endTime,
        isAllDay: localEvent.isAllDay,
      });

      // Update local event with Google ID
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
      });
    }
  }

  // Handle events that only exist in Google
  for (const googleEvent of result.googleOnly) {
    // Create event locally
    await prisma.calendarEvent.create({
      data: {
        title: googleEvent.title,
        description: googleEvent.description ?? null,
        location: googleEvent.location ?? null,
        startTime: googleEvent.startTime,
        endTime: googleEvent.endTime,
        isAllDay: googleEvent.isAllDay,
        status: "confirmed",
        userId,
        externalIds: {
          googleEventId: googleEvent.id,
          outlookEventId: null,
          calendarId: "primary",
          calendarName: "Primary Calendar",
        },
      },
    });
  }

  // Handle mismatched events
  for (const { local, google } of result.mismatched) {
    // Update local event to match Google (assuming Google is source of truth)
    await prisma.calendarEvent.update({
      where: { id: local.id },
      data: {
        title: google.title,
        description: google.description ?? null,
        location: google.location ?? null,
        startTime: google.startTime,
        endTime: google.endTime,
        isAllDay: google.isAllDay,
        status: google.status,
      },
    });
  }
}

function logSyncResults(result: SyncValidationResult): void {
  console.log("Calendar Sync Validation Results:", {
    status: result.status,
    localOnlyCount: result.localOnly.length,
    googleOnlyCount: result.googleOnly.length,
    mismatchedCount: result.mismatched.length,
    errors: result.errors,
  });

  if (result.status === "out_of_sync") {
    console.log("Detailed Sync Issues:", {
      localOnly: result.localOnly.map((e) => ({ id: e.id, title: e.title })),
      googleOnly: result.googleOnly.map((e) => ({ id: e.id, title: e.title })),
      mismatched: result.mismatched.map((m) => ({
        eventId: m.local.id,
        title: m.local.title,
        differences: m.differences,
      })),
    });
  }
}
