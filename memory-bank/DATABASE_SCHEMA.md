# Database Schema Design

## Overview

This document outlines the database schema design for our calendar application, including both existing and new models required for calendar functionality.

## Core Models

### User Model (Existing)

```prisma
model user {
  id                String   @id @default(auto()) @map("_id") @db.ObjectId
  created_time      DateTime @default(now())
  email             String   @unique
  first_name        String?
  last_name         String?
  gender            String?
  profile_image_url String?
  user_id           String   @unique
  subscription      String?
  // New relations for calendar functionality
  calendarEvents    calendarEvent[]
  calendarAccounts  calendarAccount[]
  availability      availability[]
}
```

### Calendar Event Model (New)

```prisma
model calendarEvent {
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  user        user      @relation(fields: [userId], references: [id])
  userId      String    @db.ObjectId
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  status      String    @default("confirmed") // confirmed, tentative, cancelled
  isAllDay    Boolean   @default(false)
  recurrence  Json?     // Recurrence rules in iCal format
  reminders   reminder[]
  externalIds Json?     // Map of calendar service IDs (Google Calendar, Outlook)
  attendees   Json?     // Array of attendee emails and response status
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Calendar Account Model (New)

```prisma
model calendarAccount {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  user          user     @relation(fields: [userId], references: [id])
  userId        String   @db.ObjectId
  provider      String   // google, outlook
  accountEmail  String
  accessToken   String
  refreshToken  String
  expiry        DateTime
  calendarIds   String[] // List of calendar IDs from the provider
  isPrimary     Boolean  @default(false)
  lastSynced    DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Reminder Model (New)

```prisma
model reminder {
  id              String        @id @default(auto()) @map("_id") @db.ObjectId
  event           calendarEvent @relation(fields: [eventId], references: [id])
  eventId         String        @db.ObjectId
  reminderType    String        // email, push, both
  minutesBefore   Int
  status          String        @default("pending") // pending, sent, failed
  createdAt       DateTime      @default(now())
}
```

### Availability Model (New)

```prisma
model availability {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  user        user     @relation(fields: [userId], references: [id])
  userId      String   @db.ObjectId
  dayOfWeek   Int      // 0-6 (Sunday-Saturday)
  startTime   String   // HH:mm format
  endTime     String   // HH:mm format
  isAvailable Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Key Design Decisions

1. **User Integration**

   - Extended existing user model with calendar-related relations
   - Maintains backward compatibility with existing features

2. **Calendar Events**

   - Comprehensive event model supporting both internal and external calendars
   - Flexible recurrence handling through JSON field
   - External IDs mapping for synchronization

3. **Calendar Integration**

   - Secure storage of OAuth tokens
   - Support for multiple calendar providers per user
   - Tracking of sync status and calendar IDs

4. **Availability Management**

   - Weekly schedule configuration
   - Granular control over available time slots
   - Foundation for AI-powered scheduling

5. **Reminder System**
   - Flexible reminder types
   - Status tracking for delivery
   - Multiple reminders per event

## Optimization Considerations

1. **Indexes**

   - User email for quick lookups
   - Event start/end times for efficient queries
   - External IDs for sync operations

2. **Denormalization**

   - Stored attendee information in event JSON
   - Cached external calendar IDs

3. **Performance**
   - Optimized date/time queries
   - Efficient recurring event expansion
   - Smart sync strategies

## Migration Strategy

1. **Phase 1**

   - Create new models while preserving existing ones
   - Set up indexes for optimal performance

2. **Phase 2**

   - Add OAuth integration
   - Implement calendar sync logic

3. **Phase 3**
   - Enable smart scheduling features
   - Roll out reminder system
