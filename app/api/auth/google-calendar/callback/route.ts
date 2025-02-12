import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/mongodb";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // This contains the userId we passed
    const error = searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=oauth_denied`
      );
    }

    if (!code || !state) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=invalid_request`
      );
    }

    if (!state) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=unauthorized`
      );
    }
    const clerkUserId = state;

    // Get user from database using Clerk ID
    const dbUser = await prisma.user.findUnique({
      where: { user_id: clerkUserId },
    });

    if (!dbUser) {
      throw new Error("User not found in database");
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user email from Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      throw new Error("Could not get Google account email");
    }

    // Save or update calendar account using the MongoDB user ID
    await prisma.calendarAccount.upsert({
      where: {
        userId_accountEmail: {
          userId: dbUser.id,
          accountEmail: userInfo.email,
        },
      },
      create: {
        userId: dbUser.id,
        provider: "google",
        accountEmail: userInfo.email,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!,
        expiry: new Date(tokens.expiry_date!),
        calendarIds: [],
        isPrimary: false,
      },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token!, // Only updates if new refresh token is provided
        expiry: new Date(tokens.expiry_date!),
      },
    });

    try {
      // List available calendars
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const { data: calendarList } = await calendar.calendarList.list();

      // Update calendar IDs and perform initial sync
      if (calendarList.items) {
        const calendarIds = calendarList.items.map((cal) => cal.id!);
        await prisma.calendarAccount.update({
          where: {
            userId_accountEmail: {
              userId: dbUser.id,
              accountEmail: userInfo.email,
            },
          },
          data: {
            calendarIds,
            isPrimary: {
              set:
                (await prisma.calendarAccount.count({
                  where: { userId: dbUser.id },
                })) === 1,
            },
          },
        });

        // Perform initial calendar sync
        const { GoogleCalendarService } = await import(
          "@/utils/services/google-calendar"
        );
        await GoogleCalendarService.syncCalendars(dbUser.id, userInfo.email);
      }

      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?success=true`
      );
    } catch (error) {
      console.error("Error during initial calendar sync:", error);
      // Even if sync fails, we'll redirect with success since account connection worked
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?success=true&sync=retry`
      );
    }
  } catch (error: any) {
    const errorMessage = error?.message || "Unknown error occurred";
    console.error("Error in OAuth callback:", errorMessage);
    return Response.redirect(
      `${
        process.env.NEXT_PUBLIC_APP_URL
      }/dashboard/calendar?error=server_error&message=${encodeURIComponent(
        errorMessage
      )}`
    );
  }
}
