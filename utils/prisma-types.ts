import { Prisma } from "@prisma/client";

// Define the current calendar event includes
export type CalendarEventWithIncludes = Prisma.calendarEventGetPayload<{
  include: {
    reminders: true;
  };
}>;

// Define include structure for calendar events
export type CalendarEventInclude = {
  reminders: boolean;
};

// Default include object for calendar event queries
export const defaultCalendarEventInclude: CalendarEventInclude = {
  reminders: true,
};

// Helper type for the current calendar event structure
export type CalendarEventData = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  status: string;
  isAllDay: boolean;
  recurrence: {
    freq: string;
    interval?: number;
    until?: string;
    count?: number;
    byDay?: string[];
    byMonth?: number[];
    byMonthDay?: number[];
  } | null;
  externalIds: {
    googleEventId?: string | null;
    outlookEventId?: string | null;
    calendarId?: string | null;
    calendarName?: string | null;
  } | null;
  attendees: {
    email: string;
    name?: string;
    response?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  reminders?: {
    id: string;
    eventId: string;
    reminderType: string;
    minutesBefore: number;
    status: string;
    createdAt: Date;
  }[];
};

// Types for create/update operations
export type CreateCalendarEventInput = Omit<
  Prisma.calendarEventCreateInput,
  "reminders"
> & {
  reminders?: Prisma.reminderCreateManyEventInput[];
};

export type UpdateCalendarEventInput = Omit<
  Prisma.calendarEventUpdateInput,
  "reminders"
> & {
  reminders?: Prisma.reminderUpdateManyWithoutEventNestedInput;
};

// TODO: These types will be used once the schema is updated
export type FutureTypes = {
  MeetingIntegration: {
    id: string;
    eventId: string;
    provider: string;
    meetingUrl: string;
    meetingId?: string;
    password?: string;
    settings?: any;
  };

  Attachment: {
    id: string;
    eventId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    url: string;
    uploadedAt: Date;
  };

  AgendaItem: {
    id: string;
    eventId: string;
    title: string;
    duration?: number;
    presenter?: string;
    notes?: string;
    status: string;
  };

  Comment: {
    id: string;
    eventId: string;
    userId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  };
};
