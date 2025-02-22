import { z } from "zod";
import { CalendarEventWithIncludes } from "./prisma-types";

// File Upload types
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface EventFormDataAttachment {
  name: string;
  file: File | UploadedFile;
}

export interface Attachment {
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: Date;
}

export interface MeetingIntegration {
  provider: string;
  meetingUrl: string;
  meetingId?: string;
  password?: string;
  settings?: Record<string, any>;
}

// Event Priority Type
export type EventPriority = "low" | "medium" | "high";

// Base Types
export interface BaseCalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  status: string;
  recurrence: RecurrenceRule | null;
  externalIds: ExternalIds | null;
  attendees: Attendee[];
  createdAt: Date;
  updatedAt: Date;
  reminders: Reminder[];
}

export interface RecurrenceRule {
  freq: string;
  interval?: number;
  until?: string;
  count?: number;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
}

export interface ExternalIds {
  googleEventId?: string | null;
  outlookEventId?: string | null;
  calendarId?: string | null;
  calendarName?: string | null;
}

export interface Attendee {
  email: string;
  name?: string | null;
  response?: string | null;
}

export interface Reminder {
  id: string;
  eventId: string;
  reminderType: string;
  minutesBefore: number;
  status: string;
  createdAt: Date;
}

// Enhanced event features
export interface EnhancedEventFeatures {
  colorCode?: string | null;
  priority?: EventPriority | null;
  meetingIntegration?: MeetingIntegration | null;
  attachments?: Attachment[];
  notes?: string | null;
  agendaItems?: {
    title: string;
    duration?: number | null;
    presenter?: string | null;
    notes?: string | null;
    status: string;
  }[];
  comments?: {
    id: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  tags?: string[];
  isPrivate?: boolean;
  category?: string | null;
  notifyChanges?: boolean;
}

// Zod Schemas
export const RecurrenceRuleSchema = z.object({
  freq: z.string(),
  interval: z.number().optional(),
  until: z.string().optional(),
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
  email: z.string().email(),
  name: z.string().nullable().optional(),
  response: z.string().nullable().optional(),
});

export const CalendarEventSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable(),
  location: z.string().nullable(),
  startTime: z.date(),
  endTime: z.date(),
  isAllDay: z.boolean().default(false),
  status: z.string().default("confirmed"),
  recurrence: z.union([RecurrenceRuleSchema, z.null()]),
  externalIds: ExternalIdsSchema,
  attendees: z.array(AttendeeSchema).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Form schema with enhanced features
export const EventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.date(),
  endDate: z.date(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().default(false),
  // Meeting settings
  meetingType: z.enum(["none", "google_meet"]).default("none"),
  attendees: z.array(z.string().email("Invalid email address")).optional(),
  // Advanced features
  colorCode: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
  attachments: z.array(z.any()).optional(),
  notes: z.string().nullable().optional(),
  agendaItems: z
    .array(
      z.object({
        title: z.string(),
        duration: z.number().nullable().optional(),
        presenter: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.string(),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
  category: z.string().nullable().optional(),
  notifyChanges: z.boolean().optional(),
});

export type CalendarEvent = BaseCalendarEvent & Partial<EnhancedEventFeatures>;
export type EventFormData = z.infer<typeof EventFormSchema>;
export type CalendarView = "dayGridMonth" | "timeGridWeek" | "timeGridDay";

// Google Calendar specific event type
export interface GoogleCalendarEvent extends BaseCalendarEvent {
  externalIds: {
    googleEventId: string;
    outlookEventId?: string | null;
    calendarId: string;
    calendarName: string;
  };
}

// Event with reminders from database
export type CalendarEventWithReminders = CalendarEventWithIncludes;

// Combined type for all calendar events
export type CalendarEventType =
  | CalendarEventWithReminders
  | GoogleCalendarEvent;
