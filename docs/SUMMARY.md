# Harmony - Project Summary

## Overview

Harmony is a full-stack music streaming platform built with modern web technologies. Users can upload songs, stream music, and manage their library. The platform uses private S3 storage with presigned URLs for secure file access.

## Tech Stack Summary

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI components
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - Player state management
- **React Hot Toast** - User notifications

### Backend
- **GraphQL** - API layer (Apollo Server on Next.js)
- **Supabase** - PostgreSQL database, Authentication
- **AWS S3** - File storage (songs & images)
- **Stripe** - Subscription billing (Checkout + Portal + Webhooks)

## Key Features

1. **Music Streaming**
   - Full player controls (play/pause/seek/volume)
   - Presigned URLs for private S3 access
   - Real-time playback

2. **Song Upload**
   - Direct S3 upload via presigned URLs
   - Image and audio file support
   - Metadata stored in Supabase

3. **User Features**
   - Authentication (email/password via Supabase)
   - Like songs
   - Search songs
   - Personal library

4. **Security**
   - Private S3 bucket
   - Presigned URLs expire after 5 minutes
   - HTTP-only cookies for auth
   - Row-level security in database
   - Server-side subscription sync uses Supabase service role key

## Architecture Highlights

### File Storage Flow

1. User uploads → Request presigned URL from API
2. Upload directly to S3 using presigned URL
3. Save metadata (S3 URL) to Supabase database
4. Bucket stays private, access via presigned URLs only

### Playback Flow

1. User clicks play → Request presigned URL for song file
2. Audio element uses presigned URL
3. Images use same mechanism via `S3Image` component
4. URLs expire and refresh automatically

### Authentication

- Supabase Auth handles all auth logic
- Session stored in HTTP-only cookies
- GraphQL context extracts user from session
- Protected routes check authentication

## Project Structure

```
harmony/
├── app/              # Next.js pages and API routes
├── components/       # React UI components
├── graphql/          # GraphQL schema and resolvers
├── lib/              # Utility functions (S3, GraphQL, Supabase)
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
└── docs/             # Documentation
```

## Setup Requirements

1. **Supabase** - Database and auth
   - Run `database.sql` to create tables
   - Get URL and keys from dashboard

2. **AWS S3** - File storage
   - Create bucket (private)
   - Create IAM user with `s3:PutObject` and `s3:GetObject`
   - Configure CORS for browser uploads

3. **Environment Variables**
   - Supabase URL and keys
   - AWS credentials and bucket name
   - Stripe keys (optional)

## Development Workflow

1. **Local Development**
   ```bash
   npm install
   npm run dev
   ```

2. **Build & Deploy**
   ```bash
   npm run build
   npm run start
   ```

3. **Common Tasks**
   - Upload songs via `/upload` page
   - Test GraphQL queries in browser console
   - Check logs in terminal and browser console

## Documentation Files

- **README.md** - Main documentation, getting started
- **PROJECT_STRUCTURE.md** - File structure and organization
- **docs/AWS_SETUP.md** - S3 and IAM configuration
- **docs/ARCHITECTURE.md** - System design and data flow
- **docs/API.md** - GraphQL API reference
- **docs/DEPLOYMENT.md** - Production deployment guide
- **docs/TROUBLESHOOTING.md** - Common issues and solutions
- **docs/QUICK_START.md** - 10-minute setup guide

## Key Design Decisions

1. **Presigned URLs** - Keep bucket private, generate URLs on demand
2. **GraphQL API** - Flexible queries, single endpoint
3. **Direct S3 Upload** - Browser uploads directly, reduces server load
4. **Supabase Auth** - Managed authentication, no custom auth code
5. **Zustand for Player** - Simple state management for player state

## Future Enhancements

- Playlists functionality
- User profiles and avatars
- Advanced search filters
- CloudFront CDN for faster delivery
- Real-time collaboration features

## Performance Considerations

- Direct S3 uploads (no server bandwidth)
- Presigned URLs cached in browser
- Next.js server components where possible
- Image lazy loading with S3Image component
- Database indexes on frequently queried fields

## Security Best Practices

- Private S3 bucket (no public access)
- Presigned URLs expire after 5 minutes
- HTTP-only auth cookies
- Row-level security in database
- IAM user has minimal permissions
- CORS restricted to specific domains

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **AWS S3 Docs**: https://docs.aws.amazon.com/s3
- **Next.js Docs**: https://nextjs.org/docs
- **GraphQL Docs**: https://graphql.org/learn

## License

MIT License - See LICENSE file (if exists)

---

Built with Next.js, GraphQL, Supabase, and AWS S3
