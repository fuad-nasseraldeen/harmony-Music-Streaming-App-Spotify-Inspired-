# Harmony - Music Streaming Platform

A modern full-stack music streaming application built with Next.js 16, GraphQL, Supabase, and AWS S3. Spotify-inspired UI with private bucket storage using presigned URLs.

## 🎵 Overview

Harmony is a music streaming platform where users can upload, stream, and manage their music library. The app features secure file storage with AWS S3 using presigned URLs, GraphQL API for flexible data fetching, and real-time updates via Supabase.

## ✨ Features

- **Music Streaming** - Play songs with full player controls (play/pause, next/prev, volume, seek)
- **Song Upload** - Upload songs and cover images directly to S3 using presigned URLs
- **User Authentication** - Secure auth with Supabase (email/password)
- **Liked Songs** - Save and manage your favorite tracks
- **Search** - Search songs by title or artist
- **Library Management** - View your uploaded songs
- **Private Storage** - S3 bucket stays private, access via presigned URLs
- **Responsive Design** - Works on desktop and mobile

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management (player state)
- **React Hot Toast** - Notifications

### Backend
- **GraphQL** - API layer (Apollo Server)
- **Supabase** - PostgreSQL database, Auth, Storage
- **AWS S3** - File storage (songs & images)
- **Stripe** - Payment processing (configured, not fully integrated)

## 📁 Project Structure

```
harmony/
├── app/                          # Next.js App Router pages
│   ├── api/                      # API routes
│   │   ├── graphql/              # GraphQL endpoint
│   │   ├── s3/
│   │   │   └── presign-play/     # Generate presigned URLs for playback
│   │   └── upload/
│   │       ├── route.ts          # Legacy upload route (not used)
│   │       └── presigned-url/    # Generate presigned URLs for uploads
│   ├── auth/                     # Authentication pages
│   │   ├── page.tsx              # Login/Signup page
│   │   └── test-connection/      # Debug page (dev only)
│   ├── library/                  # User's uploaded songs
│   ├── liked/                    # Liked songs page
│   ├── search/                   # Search page
│   ├── upload/                   # Upload songs page
│   ├── layout.tsx                # Root layout (Sidebar + Player)
│   ├── page.tsx                  # Home page (song list)
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── Player.tsx                # Music player component
│   ├── S3Image.tsx               # Image component with presigned URLs
│   ├── Sidebar.tsx               # Navigation sidebar
│   └── SongItem.tsx              # Song list item component
├── graphql/                      # GraphQL setup
│   ├── schema.ts                 # GraphQL schema definitions
│   ├── resolvers.ts              # GraphQL resolvers
│   └── context.ts                # GraphQL context (auth, supabase client)
├── hooks/                        # Custom React hooks
│   └── useUser.ts                # User auth state hook
├── lib/                          # Utility libraries
│   ├── graphql.ts                # GraphQL client helpers
│   ├── s3.ts                     # S3 client & presigned URL functions
│   ├── stripe.ts                 # Stripe server client
│   ├── supabase-client.ts        # Supabase browser client
│   └── supabase.ts               # Legacy Supabase client (not used)
├── providers/                    # Context providers
│   └── ToasterProvider.tsx       # React Hot Toast provider
├── store/                        # Zustand stores
│   └── usePlayerStore.ts         # Player state management
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Generated Supabase types
│   └── index.ts                  # Shared types
├── database.sql                  # Database schema
└── .env.local                    # Environment variables (not in git)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Supabase account** - [Sign up here](https://supabase.com)
- **AWS account** - For S3 storage ([Sign up here](https://aws.amazon.com))
- **Stripe account** - For payments (optional, [Sign up here](https://stripe.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd harmony
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create `.env.local` in the root directory:
   ```env
   # Supabase Configuration
   # Get from: https://app.supabase.com/project/_/settings/api
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # AWS S3 Configuration
   # Get from: AWS Console > IAM > Users > Your User > Security Credentials
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   AWS_REGION=eu-north-1  # or your bucket region
   S3_BUCKET_NAME=spotify-harmoney-music-streaming  # your bucket name
   
   # Stripe Configuration (optional)
   # Get from: https://dashboard.stripe.com/apikeys
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   
   # Site URL
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Supabase Database**

   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to **SQL Editor**
   - Run the SQL script from `database.sql` to create tables

5. **Set up AWS S3**

   See [docs/AWS_SETUP.md](./docs/AWS_SETUP.md) for detailed instructions:
   - Create S3 bucket
   - Create IAM user with `s3:PutObject` and `s3:GetObject` permissions
   - Configure CORS for browser uploads

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Documentation

### Detailed Guides

- [**AWS Setup Guide**](./docs/AWS_SETUP.md) - Complete S3 and IAM configuration
- [**Architecture Overview**](./docs/ARCHITECTURE.md) - System design and data flow
- [**API Documentation**](./docs/API.md) - GraphQL queries and mutations
- [**Deployment Guide**](./docs/DEPLOYMENT.md) - Production deployment steps

### Quick Reference

- [**GraphQL API**](#graphql-api) - Example queries and mutations
- [**File Structure**](#-project-structure) - Project organization
- [**Environment Variables**](#installation) - Required configuration

## 🔌 GraphQL API

The GraphQL API is available at `/api/graphql`. All queries and mutations require authentication except for reading public songs.

### Example Queries

```graphql
# Get all songs
query GetSongs {
  songs {
    id
    title
    author
    songPath
    imagePath
    createdAt
  }
}

# Search songs
query SearchSongs($title: String!) {
  songsByTitle(title: $title) {
    id
    title
    author
  }
}

# Get liked songs (requires auth)
query GetLikedSongs {
  likedSongs {
    id
    title
    author
  }
}
```

### Example Mutations

```graphql
# Upload song (requires auth)
mutation UploadSong(
  $title: String!
  $author: String!
  $songPath: String!
  $imagePath: String!
) {
  uploadSong(
    title: $title
    author: $author
    songPath: $songPath
    imagePath: $imagePath
  ) {
    id
    title
  }
}

# Like a song (requires auth)
mutation LikeSong($songId: ID!) {
  likeSong(songId: $songId)
}
```

## 🔐 Authentication

Authentication is handled by Supabase Auth. Users can:

- Sign up with email/password
- Log in with email/password
- Access protected routes (upload, library, liked songs)

The auth state is managed by `hooks/useUser.ts` and provides:
- User object
- Access token
- User details
- Subscription status

## 📦 File Upload Flow

1. **User selects files** (song + image) on `/upload` page
2. **Request presigned URLs** - Frontend calls `/api/upload/presigned-url`
3. **Upload to S3** - Files uploaded directly from browser to S3 using presigned URLs
4. **Save metadata** - GraphQL mutation saves S3 URLs to Supabase database

This approach keeps the S3 bucket private - no public access needed.

## 🎵 Playback Flow

1. **User clicks play** - Song selected in player
2. **Request presigned URL** - Frontend calls `/api/s3/presign-play` for the song file
3. **Play audio** - HTML5 audio element uses presigned URL
4. **Images** - Cover images also use presigned URLs via `S3Image` component

Presigned URLs expire after 5 minutes and are automatically refreshed when needed.

## 🛠️ Available Scripts

- `npm run dev` - Start development server on `http://localhost:3000`
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### S3 Upload Errors

- **CORS Error**: Check CORS configuration in S3 bucket settings
- **Access Denied**: Verify IAM user has `s3:PutObject` permission
- **Region Mismatch**: Ensure `AWS_REGION` in `.env.local` matches bucket region

### Authentication Issues

- Check Supabase URL and keys in `.env.local`
- Verify email confirmation settings in Supabase dashboard
- See `/auth/test-connection` page for diagnostics

### Database Errors

- Ensure `database.sql` has been run in Supabase SQL Editor
- Check RLS (Row Level Security) policies if queries fail
- Verify user is authenticated for protected queries

See [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for more help.

## 🚢 Deployment

For production deployment, see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

Key considerations:
- Set all environment variables in your hosting platform
- Update CORS settings in S3 to include your production domain
- Configure Supabase production database
- Set up Stripe webhooks for payment events

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ using Next.js, GraphQL, and Supabase
