import { google } from "googleapis";
import axios from "axios";

export class MeetingService {
  private static async getGoogleAuthClient() {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Note: You would need to get these tokens from your user's session/database
    auth.setCredentials({
      access_token: "", // Set from user's session
      refresh_token: "", // Set from user's session
    });

    return auth;
  }

  static async createGoogleMeet(eventData: {
    title: string;
    startTime: Date;
    description?: string;
  }) {
    try {
      const auth = await this.getGoogleAuthClient();
      const calendar = google.calendar({ version: "v3", auth });

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: eventData.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(
            eventData.startTime.getTime() + 3600000
          ).toISOString(), // 1 hour default
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        conferenceDataVersion: 1,
        requestBody: event,
      });

      if (response.data.conferenceData?.conferenceId) {
        return {
          provider: "google_meet",
          meetingUrl: response.data.conferenceData.entryPoints?.[0].uri || "",
          meetingId: response.data.conferenceData.conferenceId,
        };
      }

      throw new Error("Failed to create Google Meet link");
    } catch (error) {
      console.error("Error creating Google Meet:", error);
      throw new Error("Failed to create Google Meet meeting");
    }
  }

  static async createZoomMeeting(eventData: {
    title: string;
    startTime: Date;
    duration?: number; // in minutes
    description?: string;
  }) {
    try {
      const response = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic: eventData.title,
          type: 2, // Scheduled meeting
          start_time: eventData.startTime.toISOString(),
          duration: eventData.duration || 60,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          agenda: eventData.description,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: true,
            auto_recording: "none",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.ZOOM_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        provider: "zoom",
        meetingUrl: response.data.join_url,
        meetingId: response.data.id,
        password: response.data.password,
        settings: {
          hostEmail: response.data.host_email,
          duration: response.data.duration,
        },
      };
    } catch (error) {
      console.error("Error creating Zoom meeting:", error);
      throw new Error("Failed to create Zoom meeting");
    }
  }

  static async createMeeting(
    provider: "google_meet" | "zoom",
    eventData: {
      title: string;
      startTime: Date;
      duration?: number;
      description?: string;
    }
  ) {
    switch (provider) {
      case "google_meet":
        return this.createGoogleMeet(eventData);
      case "zoom":
        return this.createZoomMeeting(eventData);
      default:
        throw new Error("Unsupported meeting provider");
    }
  }

  static async deleteMeeting(provider: string, meetingId: string) {
    try {
      if (provider === "zoom") {
        await axios.delete(`https://api.zoom.us/v2/meetings/${meetingId}`, {
          headers: {
            Authorization: `Bearer ${process.env.ZOOM_API_KEY}`,
          },
        });
      }
      // Note: Google Meet links are automatically handled when deleting the calendar event
      return true;
    } catch (error) {
      console.error(`Error deleting ${provider} meeting:`, error);
      throw new Error(`Failed to delete ${provider} meeting`);
    }
  }
}
