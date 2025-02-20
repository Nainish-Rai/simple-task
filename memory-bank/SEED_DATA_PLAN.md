# Seed Data Plan

## Overview

Create a comprehensive seed script to populate the database with realistic test data for the calendar application.

## Implementation Details

### 1. Setup

- Create a new TypeScript seed script in `prisma/seed.ts`
- Configure Prisma Client
- Add seed script to package.json

### 2. Test Data Structure

#### Users (5-10 test users)

- Mix of free and premium users
- Various profile completeness levels
- Different timezone configurations

#### Calendar Events (30-50 per user)

- Past, present, and future events
- Mix of single and recurring events
- Various event types (meetings, personal, all-day)
- Different status types (confirmed, tentative, cancelled)
- Events with and without attendees

#### Calendar Accounts (1-3 per user)

- Mix of Google and Outlook accounts
- Primary and secondary calendars
- Various sync states

#### Reminders (2-3 per event)

- Different reminder types (email, push, both)
- Various time intervals
- Different status states

#### Availability (for each user)

- Full week coverage
- Mix of available and unavailable slots
- Different time ranges

### 3. Data Generation Strategy

1. Create utility functions for generating:

   - Realistic names and emails
   - Date ranges
   - Event titles and descriptions
   - Location data
   - Recurrence patterns

2. Implement helper functions for:
   - Creating related records
   - Generating realistic time slots
   - Setting up OAuth mock data

### 4. Implementation Order

1. Generate base user accounts
2. Create availability settings for each user
3. Add calendar accounts with mock OAuth data
4. Generate calendar events with realistic patterns
5. Add reminders for events
6. Update user references and relationships

### 5. Testing Considerations

- Include edge cases in test data
- Ensure data covers all UI scenarios
- Add data for performance testing
- Include various timezone scenarios

## Usage Instructions

1. Clear instructions for running seed script
2. Documentation of generated test accounts
3. Notes on test data patterns
4. Instructions for resetting seed data

## Next Steps

1. Switch to Code mode to implement the seed script
2. Create the necessary utility functions
3. Implement the main seeding logic
4. Add documentation and usage instructions
