import { Attachment, reminder } from "@prisma/client";

export type EventWithReminders = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  isAllDay: boolean;
  status: string;
  externalIds: {
    googleEventId?: string;
    outlookEventId?: string;
    calendarId?: string;
    calendarName?: string;
  } | null;
  attendees: { email: string; name?: string; response?: string }[];
  reminders: Reminder[];
  createdAt: Date;
  updatedAt: Date;
};

export type TempEventData = {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  enableMeet?: boolean;
  attendees?: string[];
};

export type EnhancedEvent = EventWithReminders & {
  colorCode: string | null;
  priority: "low" | "medium" | "high";
  meetingIntegration: {
    provider: string;
    meetingUrl: string;
    meetingId?: string | null;
    password?: string | null;
    settings?: Record<string, any>;
  } | null;
  attachments: Attachment[];
  notes: string | null;
  agendaItems: {
    title: string;
    duration: number | null;
    presenter: string | null;
    notes: string | null;
    status: "pending" | "completed";
  }[];
  comments: {
    id: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
  tags: string[];
  isPrivate: boolean;
  category: string | null;
  notifyChanges: boolean;
};
