import { CalendarEventWithIncludes } from "./prisma-types";
import {
  MeetingIntegration,
  Attachment,
  EnhancedEventFeatures,
  EventPriority,
  Reminder,
} from "./types";

// Temporary types for handling enhanced features before schema update
export type TempEventData = {
  meetingIntegration?: MeetingIntegration | null;
  attachments?: Attachment[];
  agendaItems?: any[];
  comments?: any[];
  tags?: string[];
  colorCode?: string | null;
  priority?: EventPriority | null;
  notes?: string | null;
  isPrivate?: boolean;
  category?: string | null;
  notifyChanges?: boolean;
};

export type EventWithReminders = {
  reminders: Reminder[];
} & CalendarEventWithIncludes;

export type EnhancedEvent = EventWithReminders & Partial<TempEventData>;

// Helper function to safely access enhanced features
export function getEnhancedFeatures(
  event: CalendarEventWithIncludes & Partial<TempEventData>
): Partial<EnhancedEventFeatures> {
  return {
    meetingIntegration: event.meetingIntegration || null,
    attachments: event.attachments || [],
    agendaItems: event.agendaItems || [],
    comments: event.comments || [],
    tags: event.tags || [],
    colorCode: event.colorCode || null,
    priority: event.priority || null,
    notes: event.notes || null,
    isPrivate: event.isPrivate || false,
    category: event.category || null,
    notifyChanges: event.notifyChanges ?? true,
  };
}

// Helper function to strip enhanced features when saving to current schema
export function stripEnhancedFeatures<T extends object>(
  data: T
): Omit<T, keyof EnhancedEventFeatures> {
  const enhancedKeys: (keyof EnhancedEventFeatures)[] = [
    "meetingIntegration",
    "attachments",
    "agendaItems",
    "comments",
    "tags",
    "colorCode",
    "priority",
    "notes",
    "isPrivate",
    "category",
    "notifyChanges",
  ];

  const result = { ...data };
  enhancedKeys.forEach((key) => delete result[key as keyof typeof result]);
  return result;
}

// Type guard for checking if event has enhanced features
export function hasEnhancedFeatures(
  event: any
): event is CalendarEventWithIncludes & Required<TempEventData> {
  return (
    event.meetingIntegration !== undefined ||
    event.attachments !== undefined ||
    event.agendaItems !== undefined ||
    event.comments !== undefined ||
    event.tags !== undefined ||
    event.priority !== undefined
  );
}
