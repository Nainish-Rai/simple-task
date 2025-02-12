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

    // For OAuth callbacks, we use the state parameter for verification
    // since the user might not be fully authenticated during the callback
    if (!state) {
      return Response.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=unauthorized`
      );
    }

    const userId = state; // Use the state parameter as userId since it was set during OAuth initialization

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token) {
      throw new Error("No access token returned");
    }

    oauth2Client.setCredentials(tokens);

    // Get user email from Google using the authenticated client
    const oauth2Service = google.oauth2("v2");
    const { data: userInfo } = await oauth2Service.userinfo.get({
      auth: oauth2Client,
    });

    if (!userInfo.email) {
      throw new Error("Could not get Google account email");
    }

    // Save or update calendar account
    await prisma.calendarAccount.upsert({
      where: {
        userId_accountEmail: {
          userId,
          accountEmail: userInfo.email,
        },
      },
      create: {
        userId,
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

    // List available calendars
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const { data: calendarList } = await calendar.calendarList.list();

    // Update calendar IDs
    if (calendarList.items) {
      const calendarIds = calendarList.items.map((cal) => cal.id!);
      await prisma.calendarAccount.update({
        where: {
          userId_accountEmail: {
            userId,
            accountEmail: userInfo.email,
          },
        },
        data: {
          calendarIds,
          // Set as primary if it's the first calendar account
          isPrimary: {
            set:
              (await prisma.calendarAccount.count({
                where: { userId },
              })) === 1,
          },
        },
      });
    }

    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?success=true`
    );
  } catch (error) {
    console.error("Error in OAuth callback:", error);
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/calendar?error=server_error`
    );
  }
}
