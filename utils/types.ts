import { z } from "zod";

export const CalendarEventSchema = z.object({
  id: z.string().optional(), // Optional for new events
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  isAllDay: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  userId: z.string(),
  calendarId: z.string().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).default("confirmed"),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

export const EventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
});

export type EventFormData = z.infer<typeof EventFormSchema>;
