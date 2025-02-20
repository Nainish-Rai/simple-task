# Technical Context

This document outlines the technical foundation of the project, including development setup, technologies used, constraints, and dependencies.

## Development Environment

- Next.js with TypeScript
- MongoDB for database
- shadcn/ui + Tailwind CSS for UI components
- ESLint + Prettier for code quality
- Jest and React Testing Library for testing

## Core Technologies

### Frontend Framework

- Next.js with App Router
- TypeScript for type safety
- React Context & Hooks for state management
- Framer Motion for animations
- Lucide Icons for iconography

### UI Framework

- shadcn/ui for component library
- Tailwind CSS for styling
- Custom theme configuration in tailwind.config.js

### Backend & Data

- Next.js API Routes
- MongoDB for document storage
- Prisma ORM for:
  - Type-safe queries
  - Schema management
  - Migrations
- MongoDB Atlas for hosting

### Authentication

- NextAuth.js with MongoDB adapter
- OAuth integration for Google and Microsoft

### External APIs

- Google Calendar API
- Microsoft Graph API
- OpenAI API for smart scheduling

## Technical Constraints

1. MongoDB schema design must optimize for calendar query performance
2. OAuth flows must handle token refresh securely
3. Real-time sync must maintain consistency across calendar services
4. API rate limits must be respected for external services

## Dependencies

Core dependencies are managed through package.json with strict version control. Key packages:

- Next.js ecosystem
- React and related libraries
- MongoDB drivers
- Prisma ORM
- shadcn/ui components
- Testing frameworks

## Performance Requirements

1. Optimal MongoDB query performance
2. Efficient calendar sync operations
3. Fast client-side interactions
4. Responsive UI across devices
