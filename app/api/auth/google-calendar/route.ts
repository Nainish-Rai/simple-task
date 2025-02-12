import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
);

// Scopes for Google Calendar API
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

export async function GET(request: NextRequest) {
  try {
    // Clerk auth automatically handles headers internally
    const { userId } = await auth();

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Generate OAuth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      prompt: "consent", // Force consent screen to get refresh token
      state: userId, // Pass userId as state to verify in callback
    });

    return Response.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating auth URL:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
