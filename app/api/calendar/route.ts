import { NextRequest, NextResponse } from "next/server";
import {
  getCalendarEvents,
  createCalendarEvent,
} from "@/utils/actions/calendar-events";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = new Date(searchParams.get("start") || new Date());
    const end = new Date(searchParams.get("end") || new Date());

    const events = await getCalendarEvents(start, end);
    return NextResponse.json(events);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const event = await createCalendarEvent(data);
    return NextResponse.json(event);
  } catch (error) {
    console.error("Failed to create event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
