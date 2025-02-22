# Technical Context

## Technology Stack

### Frontend

- Next.js 14+ with App Router
- TypeScript 5.0+
- React 18+
- Tailwind CSS
- shadcn/ui components
- Framer Motion
- React Query for data fetching

### Backend

- Next.js API Routes
- Prisma ORM
- MongoDB
- Socket.io for real-time features
- AWS S3 (for file storage)

### Authentication & Integration

- NextAuth.js
- Google Calendar API
- Microsoft Graph API
- Google Meet API
- Zoom API

### File Management

- AWS SDK for S3
- Sharp for image processing
- react-dropzone for file uploads
- react-markdown for note rendering

### Real-time Features

- Socket.io-client
- Socket.io
- Redis for pub/sub

## Development Setup

### Prerequisites

```bash
Node.js 18+
npm or yarn
MongoDB
Redis (for real-time features)
AWS Account (for S3)
```

### Environment Variables

```env
# Core
MONGODB_URI=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=

# Calendar Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=

# Meeting Services
ZOOM_API_KEY=
ZOOM_API_SECRET=
GOOGLE_MEET_CREDENTIALS=

# Real-time
REDIS_URL=
SOCKET_SERVER_URL=
```

## Technical Constraints

### File Upload

- Maximum file size: 10MB per file
- Supported formats:
  - Images: jpg, png, gif, webp
  - Documents: pdf, doc, docx, xls, xlsx
  - Media: mp4, mp3
- Storage quota per user: 100MB (configurable)

### Real-time Features

- WebSocket connection limits
- Rate limiting for comments
- Concurrent editing restrictions

### API Rate Limits

- Google Calendar: 1M requests/day
- Zoom API: Based on license
- File upload: 100 uploads/hour/user

## Performance Requirements

### Response Times

- Page load: < 2s
- API responses: < 500ms
- File upload: < 5s for 10MB
- Real-time sync: < 100ms

### Scalability Targets

- Concurrent users: 10,000+
- Events per user: 1,000+
- Attachments per event: 10+
- Active WebSocket connections: 5,000+

## Security Measures

### File Storage

- Signed URLs for file access
- Virus scanning for uploads
- File type validation
- Content disposition headers

### Real-time Security

- WebSocket authentication
- Rate limiting per connection
- Input validation
- XSS prevention

## Monitoring & Analytics

### Metrics

- File upload success rate
- WebSocket connection stability
- API response times
- Error rates by category

### Logging

- Application logs
- Access logs
- Error tracking
- User activity

## Deployment Strategy

### Infrastructure

- Vercel for Next.js
- MongoDB Atlas
- AWS S3 for storage
- Redis Cloud for real-time

### CI/CD

- GitHub Actions
- Automated testing
- Performance monitoring
- Security scanning

This document should be updated as new technical requirements or constraints are identified.
