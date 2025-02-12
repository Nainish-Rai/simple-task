import { z } from "zod";
import { Prisma } from "@prisma/client";

// Type for serializable recurrence rule
export interface RecurrenceRule {
  freq: string;
  interval?: number;
  until?: string; // ISO date string
  count?: number;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

// ExternalIds type
export interface ExternalIds {
  googleEventId?: string | null;
  outlookEventId?: string | null;
  calendarId?: string | null;
  calendarName?: string | null;
}

// Attendee type
export interface Attendee {
  email: string;
  name?: string;
  response?: string;
}

// Base calendar event interface
export interface BaseCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: string;
}

// Full calendar event type for Prisma
export interface CalendarEventData extends BaseCalendarEvent {
  userId: string;
  recurrence: RecurrenceRule | null;
  externalIds: ExternalIds | null;
  attendees: Attendee[];
  reminders?: {
    id: string;
    reminderType: string;
    minutesBefore: number;
    status: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

// Zod schemas
export const RecurrenceRuleSchema = z.object({
  freq: z.string(),
  interval: z.number().optional(),
  until: z.string().optional(), // ISO date string
  count: z.number().optional(),
  byDay: z.array(z.string()).optional(),
  byMonth: z.array(z.number()).optional(),
  byMonthDay: z.array(z.number()).optional(),
});

export const ExternalIdsSchema = z
  .object({
    googleEventId: z.string().nullable(),
    outlookEventId: z.string().nullable(),
    calendarId: z.string().nullable(),
    calendarName: z.string().nullable(),
  })
  .nullable();

export const AttendeeSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  response: z.string().optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  isAllDay: z.boolean().default(false),
  status: z.string().default("confirmed"),
  userId: z.string(),
  recurrence: z.union([RecurrenceRuleSchema, z.null()]),
  externalIds: ExternalIdsSchema,
  attendees: z.array(AttendeeSchema).optional(),
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
});

export type EventFormData = z.infer<typeof EventFormSchema>;

// Calendar Provider Types
export type CalendarProvider = "google" | "outlook";

export interface CalendarAccount {
  id: string;
  userId: string;
  provider: CalendarProvider;
  accountEmail: string;
  accessToken: string;
  refreshToken: string;
  expiry: Date;
  calendarIds: string[];
  isPrimary: boolean;
  lastSynced?: Date;
}

// Google Calendar specific event type
export interface GoogleCalendarEvent extends BaseCalendarEvent {
  externalIds: {
    googleEventId: string;
    outlookEventId?: string | null;
    calendarId: string;
    calendarName: string;
  };
}

// Type for events returned from the database
export type CalendarEventWithReminders = Prisma.calendarEventGetPayload<{
  include: { reminders: true };
}>;

// Combined type for all calendar events
export type CalendarEventType =
  | CalendarEventWithReminders
  | GoogleCalendarEvent;
