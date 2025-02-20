import { NextResponse } from "next/server";
import { getGoogleCalendarService } from "@/utils/services/google-calendar";

export async function GET() {
  try {
    await getGoogleCalendarService();
    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json({ connected: false });
  }
}
