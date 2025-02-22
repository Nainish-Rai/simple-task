# Database Schema Updates

## New Types

```prisma
type Attachment {
  fileName    String
  fileSize    Int
  fileType    String
  url         String
  uploadedAt  DateTime
}

type AgendaItem {
  title       String
  duration    Int?      // in minutes
  presenter   String?
  notes       String?
  status      String    // "pending", "completed", "skipped"
}

type Comment {
  id          String
  userId      String
  content     String
  createdAt   DateTime
  updatedAt   DateTime
}

type MeetingIntegration {
  provider    String    // "google_meet", "zoom"
  meetingUrl  String
  meetingId   String?
  password    String?
  settings    Json?
}
```

## Extended calendarEvent Model

```prisma
model calendarEvent {
  // Existing fields remain unchanged
  id          String    @id @default(auto()) @map("_id") @db.ObjectId
  user        user      @relation(fields: [userId], references: [id])
  userId      String    @db.ObjectId
  title       String
  description String?
  startTime   DateTime
  endTime     DateTime
  location    String?
  status      String    @default("confirmed")
  isAllDay    Boolean   @default(false)
  recurrence  RecurrenceRule?
  reminders   reminder[]
  externalIds ExternalIds?
  attendees   Attendee[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // New fields to add
  colorCode           String?
  priority            String?    @default("medium")  // "low", "medium", "high"
  meetingIntegration  MeetingIntegration?
  attachments         Attachment[]
  notes               String?    // Markdown supported
  agendaItems         AgendaItem[]
  comments            Comment[]
  tags               String[]
  isPrivate          Boolean    @default(false)
  category           String?
  notifyChanges      Boolean    @default(true)

  // Keep existing indexes
  @@index([startTime, endTime])
  @@index([userId, startTime])

  // Add new indexes
  @@index([priority, startTime])
  @@index([tags])
}
```

## Implementation Notes

1. Database Migration Steps:

   - Create backup of existing data
   - Add new fields with null/default values
   - Update indexes
   - Verify data integrity

2. Data Validation Rules:

   - Maximum file size: 10MB per attachment
   - Maximum attachments per event: 10
   - Maximum comment length: 1000 characters
   - Maximum agenda items: 20 per event
   - Valid priority values: "low", "medium", "high"

3. Performance Considerations:

   - Index on frequently queried fields
   - Consider partitioning for large datasets
   - Implement caching for attachment metadata
   - Monitor query performance on new fields

4. Security Measures:
   - Validate file types before upload
   - Sanitize markdown input
   - Implement role-based access for private events
   - Encrypt sensitive meeting details

This schema update provides the foundation for implementing the enhanced event features while maintaining compatibility with existing functionality.
