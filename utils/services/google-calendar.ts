import { google } from "googleapis";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/mongodb";
import { calendar_v3 } from "googleapis";

export class GoogleCalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
    });

    this.calendar = google.calendar({ version: "v3", auth: oauth2Client });
  }

  async listEvents(
    timeMin: Date,
    timeMax: Date
  ): Promise<calendar_v3.Schema$Event[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: "primary",
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      return response.data.items || [];
    } catch (error) {
      console.error("Error fetching Google Calendar events:", error);
      return [];
    }
  }

  async createEvent(event: {
    title: string;
    description?: string | null;
    location?: string | null;
    startTime: Date;
    endTime: Date;
    isAllDay: boolean;
  }): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendar.events.insert({
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

      return response.data;
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      throw error;
    }
  }

  async updateEvent(
    googleEventId: string,
    event: {
      title: string;
      description?: string | null;
      location?: string | null;
      startTime: Date;
      endTime: Date;
      isAllDay: boolean;
    }
  ): Promise<calendar_v3.Schema$Event> {
    try {
      const response = await this.calendar.events.update({
        calendarId: "primary",
        eventId: googleEventId,
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

      return response.data;
    } catch (error) {
      console.error("Error updating Google Calendar event:", error);
      throw error;
    }
  }

  async deleteEvent(googleEventId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: googleEventId,
      });
      return true;
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      throw error;
    }
  }
}

// Helper to get Google Calendar service instance
export async function getGoogleCalendarService(): Promise<GoogleCalendarService> {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // First get the user's MongoDB ID
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
  });

  if (!user) throw new Error("User not found");

  const calendarAccount = await prisma.calendarAccount.findFirst({
    where: {
      userId: user.id,
      provider: "google",
      isPrimary: true,
    },
  });

  if (!calendarAccount) {
    throw new Error("Google Calendar not connected");
  }

  // Check if token is expired and refresh if needed
  if (calendarAccount.expiry < new Date()) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
    );

    oauth2Client.setCredentials({
      refresh_token: calendarAccount.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token) {
        throw new Error("Failed to refresh access token");
      }

      // Update the tokens in database
      await prisma.calendarAccount.update({
        where: { id: calendarAccount.id },
        data: {
          accessToken: credentials.access_token,
          expiry: new Date(credentials.expiry_date || Date.now()),
        },
      });

      return new GoogleCalendarService(credentials.access_token);
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw new Error("Failed to refresh Google Calendar access");
    }
  }

  return new GoogleCalendarService(calendarAccount.accessToken);
}
