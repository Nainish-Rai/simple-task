"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/mongodb";
import { CalendarEventSchema, EventFormData } from "../types";
import { z } from "zod";

export async function getCalendarEvents(start: Date, end: Date) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId,
      startTime: {
        gte: start,
      },
      endTime: {
        lte: end,
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return events;
}

export async function createCalendarEvent(data: EventFormData) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Convert form data to calendar event data
  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  const eventData = {
    title: data.title,
    description: data.description || "",
    location: data.location || "",
    startTime,
    endTime,
    isAllDay: data.isAllDay,
    userId,
    status: "confirmed",
  };

  // Validate the data
  const validatedData = CalendarEventSchema.parse(eventData);

  // Create the event
  const event = await prisma.calendarEvent.create({
    data: validatedData,
  });

  return event;
}

export async function updateCalendarEvent(
  eventId: string,
  data: EventFormData
) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the event belongs to the user
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId,
    },
  });

  if (!existingEvent) {
    throw new Error("Event not found");
  }

  // Convert form data to calendar event data
  const startTime = new Date(data.startDate);
  const endTime = new Date(data.endDate);

  if (!data.isAllDay) {
    const [startHours, startMinutes] = (data.startTime || "00:00").split(":");
    const [endHours, endMinutes] = (data.endTime || "00:00").split(":");

    startTime.setHours(parseInt(startHours), parseInt(startMinutes));
    endTime.setHours(parseInt(endHours), parseInt(endMinutes));
  }

  const eventData = {
    title: data.title,
    description: data.description || "",
    location: data.location || "",
    startTime,
    endTime,
    isAllDay: data.isAllDay,
    userId,
    status: existingEvent.status,
  };

  // Validate the data
  const validatedData = CalendarEventSchema.parse(eventData);

  // Update the event
  const updatedEvent = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: validatedData,
  });

  return updatedEvent;
}

export async function deleteCalendarEvent(eventId: string) {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");

  // Verify the event belongs to the user
  const existingEvent = await prisma.calendarEvent.findFirst({
    where: {
      id: eventId,
      userId,
    },
  });

  if (!existingEvent) {
    throw new Error("Event not found");
  }

  // Delete the event
  await prisma.calendarEvent.delete({
    where: { id: eventId },
  });

  return true;
}
