# API Documentation

Complete GraphQL API reference for Harmony music streaming platform.

## Base URL

Development: `http://localhost:3000/api/graphql`  
Production: `https://yourdomain.com/api/graphql`

## Authentication

Most queries are public (reading songs). Mutations and some queries require authentication via Supabase session cookie.

## Queries

### `songs`

Get all songs (public).

**Request:**
```graphql
query GetSongs {
  songs {
    id
    title
    author
    songPath
    imagePath
    userId
    createdAt
  }
}
```

**Response:**
```json
{
  "data": {
    "songs": [
      {
        "id": "uuid",
        "title": "Song Title",
        "author": "Artist Name",
        "songPath": "https://bucket.s3.region.amazonaws.com/songs/file.mp3",
        "imagePath": "https://bucket.s3.region.amazonaws.com/images/file.jpg",
        "userId": "uuid",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### `song(id: ID!)`

Get a single song by ID (public).

**Request:**
```graphql
query GetSong($id: ID!) {
  song(id: $id) {
    id
    title
    author
    songPath
    imagePath
  }
}
```

**Variables:**
```json
{
  "id": "song-uuid"
}
```

### `songsByTitle(title: String!)`

Search songs by title (public).

**Request:**
```graphql
query SearchSongs($title: String!) {
  songsByTitle(title: $title) {
    id
    title
    author
    songPath
    imagePath
  }
}
```

**Variables:**
```json
{
  "title": "search term"
}
```

### `songsByUserId`

Get songs uploaded by the current user (requires auth).

**Request:**
```graphql
query GetMySongs {
  songsByUserId {
    id
    title
    author
    songPath
    imagePath
  }
}
```

### `likedSongs`

Get songs liked by the current user (requires auth).

**Request:**
```graphql
query GetLikedSongs {
  likedSongs {
    id
    title
    author
    songPath
    imagePath
  }
}
```

### `user`

Get current user profile (requires auth).

**Request:**
```graphql
query GetUser {
  user {
    id
    fullName
    avatarUrl
    isSubscribed
  }
}
```

### `subscription`

Get the current user's subscription record (requires auth). Returns `null` when not subscribed.

**Request:**
```graphql
query GetSubscription {
  subscription {
    id
    status
    currentPeriodEnd
  }
}
```

## Mutations

### `uploadSong`

Upload a new song (requires auth). Call this after uploading files to S3.

**Request:**
```graphql
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
    author
    songPath
    imagePath
  }
}
```

**Variables:**
```json
{
  "title": "My Song",
  "author": "Artist Name",
  "songPath": "https://bucket.s3.region.amazonaws.com/songs/file.mp3",
  "imagePath": "https://bucket.s3.region.amazonaws.com/images/file.jpg"
}
```

### `deleteSong(id: ID!)`

Delete a song (requires auth, must be owner).

**Request:**
```graphql
mutation DeleteSong($id: ID!) {
  deleteSong(id: $id)
}
```

**Variables:**
```json
{
  "id": "song-uuid"
}
```

### `likeSong(songId: ID!)`

Like a song (requires auth).

**Request:**
```graphql
mutation LikeSong($songId: ID!) {
  likeSong(songId: $songId)
}
```

**Variables:**
```json
{
  "songId": "song-uuid"
}
```

### `unlikeSong(songId: ID!)`

Unlike a song (requires auth).

**Request:**
```graphql
mutation UnlikeSong($songId: ID!) {
  unlikeSong(songId: $songId)
}
```

**Variables:**
```json
{
  "songId": "song-uuid"
}
```

## REST API Endpoints

### `POST /api/upload/presigned-url`

Generate presigned URLs for file uploads.

**Request Body:**
```json
{
  "fileName": "song.mp3",
  "fileType": "audio/mpeg",
  "fileCategory": "songs"
}
```

**Response:**
```json
{
  "presignedUrl": "https://bucket.s3.region.amazonaws.com/...?X-Amz-Signature=...",
  "s3Key": "songs/timestamp-song.mp3",
  "url": "https://bucket.s3.region.amazonaws.com/songs/timestamp-song.mp3"
}
```

### `POST /api/s3/presign-play`

Generate presigned URL for playback (songs or images).

**Request Body:**
```json
{
  "key": "songs/file.mp3",
  "expiresIn": 300
}
```

**Response:**
```json
{
  "playUrl": "https://bucket.s3.region.amazonaws.com/...?X-Amz-Signature=...",
  "expiresIn": 300
}
```

### Stripe endpoints

These endpoints are used by `/subscription` and checkout success handling.

#### `POST /api/create-checkout-session`

Creates a Stripe Checkout session for the Premium subscription.

#### `POST /api/create-portal-session`

Creates a Stripe Customer Portal session.

#### `POST /api/webhooks/stripe`

Stripe webhook handler (events like `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`).

Important: this runs on the server and must use `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS when syncing `subscriptions` and `users.is_subscribed`.

#### `POST /api/checkout-success`

Called after redirect from Stripe Checkout to immediately save subscription state (fallback when webhooks are delayed).

#### `POST /api/sync-subscription`

Manual sync endpoint (fallback/debug).

## Error Responses

All errors follow GraphQL error format:

```json
{
  "errors": [
    {
      "message": "Unauthorized",
      "extensions": {
        "code": "UNAUTHENTICATED"
      }
    }
  ]
}
```

### Common Error Codes

- `UNAUTHENTICATED` - User not logged in
- `UNAUTHORIZED` - User doesn't have permission
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid input data

## Type Definitions

### Song

```typescript
type Song {
  id: ID!
  userId: String!
  title: String!
  author: String!
  songPath: String!      # S3 URL
  imagePath: String!     # S3 URL
  createdAt: String
}
```

### User

```typescript
type User {
  id: ID!
  fullName: String
  avatarUrl: String
  isSubscribed: Boolean
}
```

## Example Usage (JavaScript)

```javascript
import { graphqlRequest, queries, mutations } from '@/lib/graphql';

// Get all songs
const { songs } = await graphqlRequest(queries.getSongs);

// Upload a song (after uploading files to S3)
await graphqlRequest(mutations.uploadSong, {
  title: "My Song",
  author: "Artist",
  songPath: "https://...",
  imagePath: "https://..."
});

// Like a song
await graphqlRequest(mutations.likeSong, {
  songId: "uuid"
});
```
