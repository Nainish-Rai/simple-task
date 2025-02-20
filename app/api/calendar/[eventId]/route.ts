import { NextRequest, NextResponse } from "next/server";
import {
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/utils/actions/calendar-events";

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const data = await request.json();
    const eventId = params.eventId;
    const updatedEvent = await updateCalendarEvent(eventId, data);
    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error("Failed to update event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = params.eventId;
    await deleteCalendarEvent(eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
