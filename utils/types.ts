import { Attachment } from "@prisma/client";
import { z } from "zod";

export type EventPriority = "low" | "medium" | "high";

export type Reminder = {
  id: string;
  eventId: string;
  reminderType: string;
  minutesBefore: number;
  status: string;
  createdAt: Date;
};

export type MeetingIntegration = {
  provider: string;
  meetingUrl: string;
  meetingId?: string | null;
  password?: string | null;
  settings?: Record<string, any>;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
  created: string;
  updated: string;
  calendarId?: string;
  calendarName?: string;
};

export type UploadedFile = {
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: Date;
};

export type EventFormDataAttachment =
  | {
      file: File;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    }
  | Attachment;

// Schema for event form validation
export const EventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  startTime: z.string({
    required_error: "Start time is required",
  }),
  endTime: z.string({
    required_error: "End time is required",
  }),
  location: z.string().optional(),
  isAllDay: z.boolean(),
  colorCode: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  meetingType: z.enum(["none", "google_meet"]),
  attendees: z.array(z.string()).optional(),
  notes: z.string().optional(),
  attachments: z
    .array(
      z.union([
        // New file upload
        z.object({
          file: z.instanceof(File),
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
        }),
        // Existing attachment
        z
          .object({
            fileName: z.string(),
            fileSize: z.number(),
            fileType: z.string(),
            url: z.string(),
            uploadedAt: z.date(),
          })
          .passthrough(),
      ])
    )
    .optional()
    .transform((attachments) =>
      attachments?.map((attachment) => {
        if ("file" in attachment) {
          return {
            file: attachment.file,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize,
          };
        }
        return attachment;
      })
    ),
  agendaItems: z
    .array(
      z.object({
        title: z.string(),
        duration: z.number().nullable(),
        presenter: z.string().nullable(),
        notes: z.string().nullable(),
        status: z.enum(["pending", "completed"]),
      })
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean(),
  category: z.string().optional(),
  notifyChanges: z.boolean(),
});

export type EventFormData = z.infer<typeof EventFormSchema>;

export type FileUploadProps = {
  onFileUpload: (file: File) => Promise<void>;
  onFileRemove?: (fileUrl: string) => Promise<void>;
  files?: (Attachment | EventFormDataAttachment)[];
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
};

export type CalendarEventFormData = {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay: boolean;
  priority?: "low" | "medium" | "high";
  attendees?: { email: string; name?: string }[];
  attachments?: Attachment[];
  notes?: string;
  category?: string;
  colorCode?: string;
  isPrivate: boolean;
  notifyChanges: boolean;
};

export type CalendarEventData = CalendarEventFormData & {
  id: string;
  userId: string;
  status: string;
  externalIds?: {
    googleEventId?: string;
    outlookEventId?: string;
    calendarId?: string;
    calendarName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};
