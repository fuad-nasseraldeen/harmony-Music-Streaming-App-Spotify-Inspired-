# Project Structure

Complete directory structure and file descriptions.

## Root Directory

```
harmony/
├── app/                          # Next.js App Router pages & routes
├── components/                   # React components
├── docs/                         # Documentation
├── graphql/                      # GraphQL schema, resolvers, context
├── hooks/                        # Custom React hooks
├── lib/                          # Utility libraries & clients
├── providers/                    # React context providers
├── public/                       # Static assets
├── store/                        # Zustand stores
├── types/                        # TypeScript type definitions
├── .env.local                    # Environment variables (not in git)
├── database.sql                  # Database schema
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies & scripts
├── README.md                     # Main documentation
└── PROJECT_STRUCTURE.md          # This file
```

## Directory Details

### `/app` - Next.js App Router

**Pages:**
- `page.tsx` - Home page (song list)
- `auth/page.tsx` - Login/Signup page
- `upload/page.tsx` - Song upload interface
- `library/page.tsx` - User's uploaded songs
- `liked/page.tsx` - Liked songs page
- `search/page.tsx` - Search songs page
- `subscription/page.tsx` - Premium subscription page (Stripe checkout + portal)
- `layout.tsx` - Root layout (Sidebar + Player)

**API Routes:**
- `api/graphql/route.ts` - GraphQL endpoint
- `api/upload/presigned-url/route.ts` - Generate S3 upload URLs
- `api/s3/presign-play/route.ts` - Generate S3 playback URLs
- `api/webhooks/stripe/route.ts` - Stripe webhook handler
- `api/create-checkout-session/route.ts` - Stripe Checkout session
- `api/create-portal-session/route.ts` - Stripe customer portal session
- `api/checkout-success/route.ts` - Save subscription right after checkout redirect
- `api/sync-subscription/route.ts` - Manual subscription sync
- `api/upload/route.ts` - Legacy upload route (deprecated)

### `/components` - React Components

- `Player.tsx` - Music player with controls (play/pause/seek/volume)
- `S3Image.tsx` - Image component that uses presigned URLs
- `Sidebar.tsx` - Navigation sidebar
- `SongItem.tsx` - Song list item component

### `/graphql` - GraphQL API

- `schema.ts` - GraphQL type definitions
- `resolvers.ts` - Query/mutation resolvers
- `context.ts` - GraphQL context (auth, Supabase client)

### `/lib` - Utilities

- `graphql.ts` - GraphQL client helper functions
- `s3.ts` - AWS S3 client & presigned URL functions
- `stripe.ts` - Stripe server client
- `supabase-client.ts` - Supabase browser client
- `supabase.ts` - Legacy client (not used)

### `/hooks` - Custom Hooks

- `useUser.ts` - User authentication state hook
- `useSubscription.ts` - Subscription status hook (wraps the subscription store)

### `/store` - State Management

- `usePlayerStore.ts` - Zustand store for player state
- `useSubscriptionStore.ts` - Zustand store for subscription status (cached)

### `/types` - Type Definitions

- `database.ts` - Generated Supabase types
- `index.ts` - Shared TypeScript interfaces

### `/docs` - Documentation

- `AWS_SETUP.md` - S3 and IAM setup guide
- `ARCHITECTURE.md` - System architecture overview
- `API.md` - GraphQL API reference
- `DEPLOYMENT.md` - Production deployment guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `QUICK_START.md` - Quick start guide

## File Naming Conventions

- **Components**: PascalCase (`Player.tsx`, `SongItem.tsx`)
- **Pages**: lowercase (`page.tsx`, `layout.tsx`)
- **Utilities**: camelCase (`graphql.ts`, `s3.ts`)
- **Types**: camelCase (`database.ts`, `index.ts`)
- **Config**: lowercase with extensions (`next.config.ts`, `package.json`)

## Key Files to Know

### Entry Points

- `app/layout.tsx` - App entry point, wraps all pages
- `app/page.tsx` - Home page
- `app/api/graphql/route.ts` - GraphQL API entry point

### Configuration

- `.env.local` - Environment variables (create this)
- `next.config.ts` - Next.js settings
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

### Database

- `database.sql` - Run this in Supabase to create tables
- `types/database.ts` - Generated types from Supabase schema

### Core Logic

- `graphql/resolvers.ts` - All business logic
- `lib/s3.ts` - S3 upload/download logic
- `store/usePlayerStore.ts` - Player state management

## Where to Add New Features

- **New page**: Add to `/app/[page-name]/page.tsx`
- **New API endpoint**: Add to `/app/api/[endpoint]/route.ts`
- **New component**: Add to `/components/[Component].tsx`
- **New GraphQL query**: Add to `graphql/schema.ts` and `graphql/resolvers.ts`
- **New type**: Add to `/types/index.ts`

## Code Organization Principles

1. **Feature-based grouping** - Related code stays together
2. **Separation of concerns** - UI, API, and logic are separate
3. **Reusable components** - Components are modular and reusable
4. **Type safety** - TypeScript types throughout
5. **Server/client split** - Server components where possible, client where needed
