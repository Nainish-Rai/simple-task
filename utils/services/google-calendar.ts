import { google } from "googleapis";
import { prisma } from "@/lib/mongodb";
import { calendar_v3 } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
);

export interface GoogleCalendarEventInput {
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
}

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string, refreshToken: string) {
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.calendar = google.calendar({ version: "v3", auth: oauth2Client });
  }

  async listEvents(start: Date, end: Date) {
    try {
      // First get list of all calendars
      const { data: calendarList } = await this.calendar.calendarList.list();

      // Fetch events from all calendars
      const allEvents: calendar_v3.Schema$Event[] = [];

      for (const cal of calendarList.items || []) {
        if (!cal.id) continue;

        const { data } = await this.calendar.events.list({
          calendarId: cal.id,
          timeMin: start.toISOString(),
          timeMax: end.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
        });

        // Add calendar name to each event for display
        const eventsWithSource = (data.items || []).map((event) => ({
          ...event,
          calendarId: cal.id,
          calendarName: cal.summary || "Unknown Calendar",
        }));

        allEvents.push(...eventsWithSource);
      }

      return allEvents;
    } catch (error) {
      console.error("Error listing events:", error);
      throw new Error("Failed to list events");
    }
  }

  async createEvent(event: GoogleCalendarEventInput) {
    try {
      const { data } = await this.calendar.events.insert({
        calendarId: "primary",
        requestBody: {
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          start: event.isAllDay
            ? { date: event.startTime.toISOString().split("T")[0] }
            : { dateTime: event.startTime.toISOString() },
          end: event.isAllDay
            ? { date: event.endTime.toISOString().split("T")[0] }
            : { dateTime: event.endTime.toISOString() },
        },
      });
      return data;
    } catch (error) {
      console.error("Error creating event:", error);
      throw new Error("Failed to create event");
    }
  }

  async updateEvent(eventId: string, event: GoogleCalendarEventInput) {
    try {
      const { data } = await this.calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: {
          summary: event.title,
          description: event.description || undefined,
          location: event.location || undefined,
          start: event.isAllDay
            ? { date: event.startTime.toISOString().split("T")[0] }
            : { dateTime: event.startTime.toISOString() },
          end: event.isAllDay
            ? { date: event.endTime.toISOString().split("T")[0] }
            : { dateTime: event.endTime.toISOString() },
        },
      });
      return data;
    } catch (error) {
      console.error("Error updating event:", error);
      throw new Error("Failed to update event");
    }
  }

  async deleteEvent(eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });
      return true;
    } catch (error) {
      console.error("Error deleting event:", error);
      throw new Error("Failed to delete event");
    }
  }

  static async refreshAccessToken(userId: string, accountEmail: string) {
    const account = await prisma.calendarAccount.findUnique({
      where: {
        userId_accountEmail: { userId, accountEmail },
      },
    });

    if (!account || !account.refreshToken) {
      throw new Error("No refresh token found");
    }

    oauth2Client.setCredentials({
      refresh_token: account.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      await prisma.calendarAccount.update({
        where: {
          userId_accountEmail: { userId, accountEmail },
        },
        data: {
          accessToken: credentials.access_token!,
          expiry: new Date(credentials.expiry_date!),
        },
      });

      return credentials.access_token;
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw new Error("Failed to refresh access token");
    }
  }

  static async syncCalendars(userId: string, accountEmail: string) {
    const account = await prisma.calendarAccount.findUnique({
      where: {
        userId_accountEmail: { userId, accountEmail },
      },
    });

    if (!account) {
      throw new Error("Calendar account not found");
    }

    // Check if token needs refresh
    if (new Date() > new Date(account.expiry)) {
      await this.refreshAccessToken(userId, accountEmail);
    }

    oauth2Client.setCredentials({
      access_token: account.accessToken,
      refresh_token: account.refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      // Get list of calendars
      const { data: calendarList } = await calendar.calendarList.list();

      // Get events for each calendar
      for (const cal of calendarList.items || []) {
        if (!cal.id) continue;

        const { data: events } = await calendar.events.list({
          calendarId: cal.id,
          timeMin: new Date().toISOString(),
          maxResults: 100,
          singleEvents: true,
          orderBy: "startTime",
        });

        // Sync events to database
        for (const event of events.items || []) {
          if (!event.id || !event.summary) continue;

          const startTime = event.start?.dateTime || event.start?.date;
          const endTime = event.end?.dateTime || event.end?.date;

          if (!startTime || !endTime) continue;

          const attendees =
            event.attendees?.map((attendee) => ({
              email: attendee.email || "",
              name: attendee.displayName,
              response: attendee.responseStatus || "needsAction",
            })) || [];

          const recurrence = event.recurrence
            ? {
                freq:
                  event.recurrence[0]
                    ?.split(";")[0]
                    ?.replace("RRULE:FREQ=", "") || "NONE",
                interval: parseInt(
                  event.recurrence[0]?.match(/INTERVAL=(\d+)/)?.[1] || "1"
                ),
                until: event.recurrence[0]?.match(/UNTIL=(\d{8}T\d{6}Z)/)?.[1]
                  ? new Date(
                      event.recurrence[0].match(/UNTIL=(\d{8}T\d{6}Z)/)?.[1] ||
                        ""
                    )
                  : undefined,
                count:
                  parseInt(
                    event.recurrence[0]?.match(/COUNT=(\d+)/)?.[1] || "0"
                  ) || undefined,
                byDay:
                  event.recurrence[0]
                    ?.match(/BYDAY=([^;]+)/)?.[1]
                    ?.split(",") || [],
              }
            : undefined;

          await prisma.calendarEvent.upsert({
            where: {
              id: event.id,
            },
            create: {
              userId,
              title: event.summary,
              description: event.description || "",
              startTime: new Date(startTime),
              endTime: new Date(endTime),
              location: event.location || "",
              isAllDay: !event.start?.dateTime, // If no time specified, it's an all-day event
              recurrence,
              externalIds: {
                googleEventId: event.id,
                outlookEventId: null,
                calendarId: cal.id,
                calendarName: cal.summary || "Unknown Calendar",
              },
              attendees,
              status: event.status || "confirmed",
            },
            update: {
              title: event.summary,
              description: event.description || "",
              startTime: new Date(startTime),
              endTime: new Date(endTime),
              location: event.location || "",
              isAllDay: !event.start?.dateTime,
              recurrence,
              attendees,
              status: event.status || "confirmed",
              updatedAt: new Date(),
            },
          });
        }
      }

      // Update lastSynced timestamp
      await prisma.calendarAccount.update({
        where: {
          userId_accountEmail: { userId, accountEmail },
        },
        data: {
          lastSynced: new Date(),
        },
      });

      return true;
    } catch (error) {
      console.error("Error syncing calendars:", error);
      throw new Error("Failed to sync calendars");
    }
  }
}

// Helper function to get a GoogleCalendarService instance
export async function getGoogleCalendarService() {
  // For now, we'll just use the first connected account
  const account = await prisma.calendarAccount.findFirst({
    where: {
      AND: [{ accessToken: { not: "" } }, { refreshToken: { not: "" } }],
    },
  });

  if (!account) {
    throw new Error("No connected Google Calendar account found");
  }

  // Check if token needs refresh
  if (new Date() > new Date(account.expiry)) {
    await GoogleCalendarService.refreshAccessToken(
      account.userId,
      account.accountEmail
    );
    // Refetch account to get new access token
    const updatedAccount = await prisma.calendarAccount.findFirst({
      where: {
        userId: account.userId,
        accountEmail: account.accountEmail,
      },
    });
    if (!updatedAccount) {
      throw new Error("Failed to refresh account access");
    }
    account.accessToken = updatedAccount.accessToken;
    account.refreshToken = updatedAccount.refreshToken;
  }

  return new GoogleCalendarService(account.accessToken, account.refreshToken);
}
