# AWS S3 Setup Guide

Complete guide to setting up AWS S3 for file storage in Harmony.

## Overview

Harmony uses AWS S3 for storing music files and cover images. The bucket is **private** and access is granted via **presigned URLs** for both uploads and downloads.

## Step 1: Create S3 Bucket

1. Go to [AWS Console](https://console.aws.amazon.com) > **S3**
2. Click **Create bucket**
3. Configure bucket:
   - **Bucket name**: `spotify-harmoney-music-streaming` (or your preferred name)
   - **Region**: Choose your region (e.g., `eu-north-1`)
   - **Block Public Access**: ✅ **Keep enabled** (bucket stays private)
   - **Versioning**: Optional
   - Click **Create bucket**

## Step 2: Create IAM User

1. Go to **IAM** > **Users** > **Create user**
2. **User name**: `harmony-s3-uploader` (or your choice)
3. **Access type**: Select **Programmatic access**
4. Click **Next: Permissions**

## Step 3: Create IAM Policy

1. Click **Create policy**
2. Switch to **JSON** tab
3. Paste this policy (replace `your-bucket-name` with your bucket name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name/*",
        "arn:aws:s3:::your-bucket-name"
      ]
    }
  ]
}
```

4. Click **Next**, name it `HarmonyS3Access`, click **Create policy**
5. Go back to user creation, refresh policies, select `HarmonyS3Access`
6. Click **Next** > **Create user**

## Step 4: Save Access Keys

**Important**: Save these now - you won't see the secret key again!

- **Access Key ID**: Copy this
- **Secret Access Key**: Copy this (click **Show** if hidden)

Add to `.env.local`:
```env
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=eu-north-1
S3_BUCKET_NAME=spotify-harmoney-music-streaming
```

## Step 5: Configure CORS

CORS is required for browser-based uploads.

1. Go to S3 > Your bucket > **Permissions** tab
2. Scroll to **Cross-origin resource sharing (CORS)**
3. Click **Edit**, paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://yourdomain.com"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

4. Replace `https://yourdomain.com` with your production domain
5. Click **Save changes**

Notes:
- For direct uploads, the browser will send a preflight request (OPTIONS). The S3 CORS config must allow the origin and headers.
- Keep the bucket private. Do not add a public bucket policy for playback; Harmony uses presigned GET URLs.

## Step 6: Test Upload

1. Start your dev server: `npm run dev`
2. Go to `/upload` page
3. Select a song and image
4. Click upload - should work without errors!

## Troubleshooting

### "Access Denied" Error
- Check IAM user has the policy attached
- Verify bucket name in policy matches your bucket
- Ensure `s3:PutObject` and `s3:GetObject` are in the policy

### "CORS Error"
- Verify CORS configuration includes `PUT` method
- Check `AllowedOrigins` includes your domain
- Ensure localhost is included for development

### "Region Mismatch" Error
- Check `AWS_REGION` in `.env.local` matches bucket region
- Bucket region is shown in S3 Console > Bucket > Properties

## File Structure in S3

Files are organized as:
```
bucket-name/
├── songs/
│   └── timestamp-filename.mp3
└── images/
    └── timestamp-filename.jpg
```

## Security Notes

- ✅ Bucket is private (no public access)
- ✅ Files accessed via presigned URLs only
- ✅ URLs expire after 5 minutes
- ✅ IAM user has minimal permissions (only PutObject/GetObject)
- ⚠️ Don't commit `.env.local` to git!

## Cost Optimization

- S3 storage: ~$0.023/GB/month (Standard)
- Data transfer: Free for first 100GB/month
- Requests: Minimal cost for PUT/GET operations

For production, consider:
- S3 Lifecycle policies for old files
- CloudFront CDN for faster delivery
- Compression before upload
