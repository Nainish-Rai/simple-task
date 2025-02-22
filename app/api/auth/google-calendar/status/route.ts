import { NextResponse } from "next/server";
import { getGoogleCalendarService } from "@/utils/services/google-calendar";

export async function GET() {
  try {
    const service = await getGoogleCalendarService();
    // Verify connection by attempting to list events for today
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await service.listEvents(today, tomorrow);
    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("Failed to verify Google Calendar connection:", error);
    return NextResponse.json({ connected: false });
  }
}
