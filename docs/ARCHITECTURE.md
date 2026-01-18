# Architecture Overview

Technical architecture and data flow for Harmony music streaming platform.

## System Architecture

```
┌─────────────┐
│   Browser   │
│  (React)    │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│   Next.js   │   │  GraphQL    │
│   App       │──▶│   API       │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 ▼
       │          ┌─────────────┐
       │          │  Supabase   │
       │          │  (Postgres) │
       │          └─────────────┘
       │
       ▼
┌─────────────┐
│   AWS S3    │
│  (Storage)  │
└─────────────┘
```

## Data Flow

### Song Upload Flow

1. **User selects files** (`/upload` page)
2. **Request presigned URLs** → `POST /api/upload/presigned-url`
   - Server generates presigned PUT URLs for S3
3. **Upload directly to S3** → Browser uploads files using presigned URLs
   - No data passes through Next.js server
   - Reduces server load
4. **Save metadata** → `GraphQL mutation: uploadSong`
   - Saves S3 URLs to Supabase database
   - Returns song object with IDs

### Playback Flow

1. **User clicks play** → Song selected in player
2. **Request presigned URL** → `POST /api/s3/presign-play`
   - Server generates presigned GET URL for song file
   - Valid for 5 minutes
3. **Play audio** → HTML5 `<audio>` element uses presigned URL
4. **Image display** → `S3Image` component fetches presigned URL for cover

### Authentication Flow

1. **Sign up/Login** → Supabase Auth (`/auth` page)
2. **Session stored** → HTTP-only cookies (managed by `@supabase/ssr`)
3. **GraphQL context** → Server extracts user from session
4. **Protected queries** → Check `context.userId` in resolvers

## Key Components

### Frontend (Next.js App Router)

- **`app/page.tsx`** - Home page, displays song list
- **`app/upload/page.tsx`** - Upload interface with S3 presigned URLs
- **`components/Player.tsx`** - Music player with controls
- **`components/S3Image.tsx`** - Image component with presigned URLs
- **`store/usePlayerStore.ts`** - Global player state (Zustand)

### Backend (API Routes)

- **`app/api/graphql/route.ts`** - GraphQL endpoint (Apollo Server)
- **`app/api/upload/presigned-url/route.ts`** - Generate upload URLs
- **`app/api/s3/presign-play/route.ts`** - Generate playback URLs
- **`graphql/resolvers.ts`** - Business logic for queries/mutations
- **`graphql/context.ts`** - Auth and database context

### Database (Supabase PostgreSQL)

- **`songs`** - Song metadata (title, author, S3 paths)
- **`liked_songs`** - User likes (junction table)
- **`users`** - User profiles
- **`subscriptions`** - Stripe subscriptions (future)

### Storage (AWS S3)

- **`songs/`** - Audio files (MP3, etc.)
- **`images/`** - Cover images (JPG, PNG)
- **Access**: Private bucket, presigned URLs only

## State Management

### Client-Side State

- **Zustand** (`usePlayerStore`) - Player state (active song, playing, volume)
- **React Context** (`useUser`) - User authentication state
- **React State** - Component-local state (forms, UI)

### Server-Side State

- **Supabase** - Database state (songs, users, likes)
- **S3** - File storage (actual media files)
- **GraphQL** - Query caching (Apollo Client default)

## Security Considerations

### File Upload Security

- ✅ Presigned URLs expire (1 hour for upload, 5 min for playback)
- ✅ Bucket is private (no public access)
- ✅ IAM user has minimal permissions
- ✅ CORS configured for specific origins only

### Authentication Security

- ✅ HTTP-only cookies (can't be accessed by JavaScript)
- ✅ Supabase RLS (Row Level Security) on database
- ✅ GraphQL resolvers check auth before mutations
- ✅ Server-side session validation

### Data Protection

- ✅ Environment variables for secrets (not in code)
- ✅ TypeScript for type safety
- ✅ Input validation in GraphQL resolvers
- ✅ SQL injection protection (Supabase uses parameterized queries)

## Performance Optimizations

### Frontend

- **Next.js App Router** - Server components where possible
- **Image optimization** - Presigned URLs for lazy loading
- **State management** - Zustand for minimal re-renders
- **Code splitting** - Automatic with Next.js

### Backend

- **Direct S3 uploads** - Bypasses Next.js server (reduces bandwidth)
- **Presigned URLs** - Cached in browser, no repeated requests
- **GraphQL** - Fetch only needed fields
- **Database indexing** - On `user_id`, `song_id` for fast queries

## Scalability

### Current Limitations

- Single S3 bucket (works for thousands of files)
- Supabase free tier (500MB database)
- No CDN for file delivery

### Future Improvements

- **CloudFront CDN** - Faster global file delivery
- **S3 Lifecycle** - Archive old files to cheaper storage
- **Database sharding** - If database grows large
- **Caching layer** - Redis for frequently accessed data
- **WebSocket** - Real-time updates instead of polling

## Error Handling

- **Client-side** - React Hot Toast for user notifications
- **Server-side** - GraphQL error responses with messages
- **S3 errors** - Detailed error messages for debugging
- **Auth errors** - Redirect to login page with messages

## Development vs Production

### Development
- Local Next.js server (`localhost:3000`)
- Supabase development project
- AWS S3 test bucket
- Local environment variables

### Production
- Vercel/Next.js hosting
- Supabase production project
- AWS S3 production bucket
- Environment variables in hosting platform
- CORS updated for production domain
