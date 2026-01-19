## Why this project exists

Harmony is a production-style music streaming app built to explore
real-world constraints around media delivery, subscriptions, and access control.

Key decisions:
- Media is never streamed through the app server (S3 presigned URLs only)
- Subscriptions are server-authoritative (Stripe webhooks → DB)
- GraphQL is used where it improves data composition, REST where it doesn’t
- All access is enforced at the database level via RLS


# Harmony

A full-stack music streaming app built with Next.js (App Router), Supabase, GraphQL, AWS S3, and Stripe.

Harmony lets users upload songs + cover art, stream from a private S3 bucket using presigned URLs, and unlock playback via a Stripe subscription.

## Features

- **Auth**: Supabase email/password auth
- **Upload**: direct browser upload to a private S3 bucket (presigned PUT)
- **Playback**: presigned GET URLs for songs and images
- **Premium**: Stripe subscription + customer portal
- **Player**: play/pause, seek, next/prev, volume
- **Library + Likes + Search**

## Tech stack

- **Next.js 16**, **React**, **TypeScript**, **Tailwind**
- **Supabase** (Postgres + Auth + RLS)
- **GraphQL** (Apollo Server on `/api/graphql`)
- **AWS S3** (private media storage)
- **Stripe** (subscriptions + webhooks)

## Trade-offs & limitations

- Presigned URLs are short-lived and require refresh logic
- Optimistic subscription unlock requires reconciliation via webhooks
- No audio transcoding or bitrate adaptation (out of scope)
- Search is DB-based, not Elastic (acceptable for current scale)


## Getting started

### Prerequisites

- Node.js 18+
- Supabase project
- AWS account (S3)
- Stripe account (subscriptions)

### Installation

```bash
npm install
```

Create `.env.local`:

```env
# Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Supabase (Service Role - server only, required for Stripe sync)
SUPABASE_SERVICE_ROLE_KEY=...

# AWS S3 (private bucket)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-north-1
S3_BUCKET_NAME=your-bucket-name

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Apply database schema:

- Supabase Dashboard -> SQL Editor -> run `database.sql`

Run:

```bash
npm run dev
```

## Premium and playback gating

- If a user is **not subscribed**, clicking play shows a message and redirects to `/subscription`.
- Subscription status is cached in a global Zustand store: `store/useSubscriptionStore.ts`.
- After successful checkout, the app sets an optimistic subscribed state to unlock playback immediately.

Test card (Stripe test mode): `4242 4242 4242 4242` (any future expiry, any CVC, any ZIP).

## API

GraphQL endpoint: `/api/graphql`

REST endpoints used by the app:

- `POST /api/upload/presigned-url` (presigned PUT for uploads)
- `POST /api/s3/presign-play` (presigned GET for playback)
- `POST /api/create-checkout-session`
- `POST /api/create-portal-session`
- `POST /api/webhooks/stripe`
- `POST /api/checkout-success` (sync subscription after redirect)
- `POST /api/sync-subscription` (manual sync fallback)

## Documentation

- `docs/INDEX.md` - documentation map
- `docs/QUICK_START.md` - quick local setup
- `docs/AWS_SETUP.md` - S3 bucket + IAM + CORS
- `docs/ARCHITECTURE.md` - data flow and key components
- `docs/API.md` - GraphQL + REST endpoints
- `docs/DEPLOYMENT.md` - production checklist
- `docs/TROUBLESHOOTING.md` - common issues

