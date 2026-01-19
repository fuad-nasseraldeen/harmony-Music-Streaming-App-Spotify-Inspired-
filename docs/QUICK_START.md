# Quick Start Guide

Get Harmony running locally.

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- AWS account (for S3)
- Stripe account (for subscriptions)

## Step 1: Clone & Install

```bash
git clone <repo-url>
cd harmony
npm install
```

## Step 2: Set Up Supabase

1. Create new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor, run `database.sql`
3. Copy URL and anon key from Settings > API
4. Copy the service role key from Settings > API (server only)

## Step 3: Set Up AWS S3

1. Create a private S3 bucket
2. Create IAM user with access keys
3. Attach policy with `s3:PutObject` and `s3:GetObject`
4. Configure CORS (see `docs/AWS_SETUP.md`)

## Step 4: Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=eu-north-1
S3_BUCKET_NAME=spotify-harmoney-music-streaming
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Step 5: Run

```bash
npm run dev
```

Open http://localhost:3000

## First Steps

1. **Sign up** - Create account at `/auth`
2. **Upload a song** - Go to `/upload` and upload a song + image
3. **Subscribe (Premium)** - Go to `/subscription`
   - Test card: `4242 4242 4242 4242` (any future expiry, any CVC, any ZIP)
4. **Play music** - Click any song to play (playback is gated behind Premium)

## Common Issues

- **CORS error?** - Check S3 CORS configuration
- **Access denied?** - Verify IAM user has correct permissions
- **Can't sign up?** - Check Supabase email settings

See `docs/TROUBLESHOOTING.md` for more help.
